using Azure;
using Azure.AI.OpenAI;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Prompts;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Guards;
using BlotzTask.Modules.AiCoach.Domain.Kernel;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Domain.Support;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace BlotzTask.Tests.AiCoach.Evaluation;

public sealed record RecordedModelCall(ModelGatewayRequest Request, string? RawOutput);

/// <summary>Everything one evaluated turn produced: model result, Kernel transition, state before/after.</summary>
public sealed record EvalTurnResult(
    int TurnIndex,
    string UserMessage,
    ConversationSnapshot StateBefore,
    ModelTurnRunResult ModelResult,
    StateTransition Transition,
    ConversationSnapshot StateAfter,
    string? PreviousAssistantQuestion,
    IReadOnlyList<RecordedModelCall> ModelCalls)
{
    public ValidatedTurnOutcome? Outcome => ModelResult.Outcome;

    public string AssistantMessage => Outcome?.AssistantMessage ?? string.Empty;
}

/// <summary>
/// Shared eval harness (eval plan §5.2): drives the REAL <see cref="ConversationKernel"/> and the REAL
/// <see cref="ModelTurnRuntime"/> (prompt modules, context builder, evidence guard, planning and
/// support policies, post-policy, response/proposal guards) with a swappable gateway — scripted
/// candidates for the deterministic architecture layer, the Azure deployment for the live layer.
/// Only the model gateway and the store are replaced; no policy, guard or state machine is
/// re-implemented here (§4.1). Time is pinned so "明天"/"周二" never drift with the run date.
/// </summary>
public sealed class AiCoachEvalHarness
{
    /// <summary>Monday 2026-09-14 10:00 Sydney — every relative date in a case resolves from here.</summary>
    public static readonly DateTimeOffset FixedLocalNow = new(2026, 9, 14, 10, 0, 0, TimeSpan.FromHours(10));

    public const string TimeZoneId = "Australia/Sydney";

    private static readonly TimeSpan EffectLease = TimeSpan.FromSeconds(180);

    private readonly ConversationKernel _kernel = new();
    private readonly ILogger<ModelTurnRuntime> _logger;
    private readonly List<EvalTurnResult> _turns = [];

    public AiCoachEvalHarness(AiCoachMode mode, IModelGateway gateway, ILogger<ModelTurnRuntime>? logger = null)
    {
        Mode = mode switch
        {
            AiCoachMode.Execution => ExecutionModeDefinition.Create(),
            AiCoachMode.Clarify => ClarifyModeDefinition.Create(),
            AiCoachMode.Companion => CompanionModeDefinition.Create(),
            _ => throw new ArgumentOutOfRangeException(nameof(mode), mode, "Only registered modes can be evaluated."),
        };
        Gateway = gateway;
        _logger = logger ?? NullLogger<ModelTurnRuntime>.Instance;

        // Mirrors StartConversationCommandHandler: versions pinned from the mode definition.
        var now = FixedLocalNow.ToUniversalTime();
        Conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Mode = mode,
            TimeZoneId = TimeZoneId,
            RuntimeVersions = Mode.ToRuntimeVersions(protocolVersion: 2),
            CreatedAt = now,
            ExpiresAt = now.AddHours(24),
        };
    }

    public AiCoachModeDefinition Mode { get; }

    public Conversation Conversation { get; }

    /// <summary>Swap between turns to seed with scripted candidates and then run the live model.</summary>
    public IModelGateway Gateway { get; set; }

    public IReadOnlyList<EvalTurnResult> Turns => _turns;

    /// <summary>
    /// One full user turn through the production path: UserMessageReceived -> Kernel -> model
    /// effect -> ModelTurnRuntime -> ModelTurnCompleted/Failed -> Kernel -> aggregate.
    /// </summary>
    public async Task<EvalTurnResult> RunTurnAsync(string userMessage, CancellationToken ct = default)
    {
        var turnIndex = _turns.Count + 1;
        var now = FixedLocalNow.ToUniversalTime().AddMinutes(turnIndex);
        var before = Conversation.ToSnapshot();

        var lastAssistant = Conversation.Messages.LastOrDefault(m => m.Role == ConversationMessageRole.Assistant);
        var previousQuestion = lastAssistant?.Strategy is { } strategy && strategy.AsksQuestion()
            ? lastAssistant.Content
            : null;

        var messageId = Guid.NewGuid();
        var userTransition = _kernel.Apply(before, new UserMessageReceived(messageId, userMessage, now), Mode);
        if (!userTransition.IsAccepted)
            throw new InvalidOperationException($"Kernel rejected the user message: {userTransition.Rejection}.");

        var effects = Conversation.ApplyTransition(userTransition, now, EffectLease);
        var effect = effects.Single(e => e.Request is GenerateModelTurnEffectRequest);
        effect.MarkRunning();

        var recording = new RecordingGateway(Gateway);
        var runtime = BuildRuntime(recording, _logger);
        var request = new ModelTurnRequest(
            Conversation.ToSnapshot(),
            effect.Id,
            Mode,
            Conversation.Messages.ToList(),
            TimeZoneId,
            FixedLocalNow);
        var result = await runtime.ExecuteAsync(request, ct);

        // Same mapping as GenerateModelTurnEffectHandler.
        ConversationEvent resultEvent = result.CompletionReason switch
        {
            ModelTurnCompletionReason.Completed => new ModelTurnCompleted(
                effect.Id, effect.BaseConversationVersion, result.Outcome!),
            ModelTurnCompletionReason.ContentFiltered => Failed(AiGenerationErrorCode.ContentFiltered),
            ModelTurnCompletionReason.TimedOut => Failed(AiGenerationErrorCode.TimedOut),
            ModelTurnCompletionReason.Cancelled => Failed(AiGenerationErrorCode.Cancelled),
            ModelTurnCompletionReason.ModelUnavailable => Failed(AiGenerationErrorCode.ModelUnavailable),
            _ => Failed(AiGenerationErrorCode.InvalidModelResponse),
        };

        var transition = _kernel.Apply(Conversation.ToSnapshot(), resultEvent, Mode);
        if (transition.IsAccepted)
        {
            Conversation.ApplyTransition(transition, now, EffectLease);
            if (resultEvent is ModelTurnFailed failed)
                effect.MarkFailed(now, failed.ErrorCode.ToString());
            else
                effect.MarkCompleted(now);
        }
        else
        {
            effect.MarkSuperseded(now);
        }

        var turn = new EvalTurnResult(
            turnIndex, userMessage, before, result, transition, Conversation.ToSnapshot(), previousQuestion, recording.Calls);
        _turns.Add(turn);
        return turn;

        ModelTurnFailed Failed(AiGenerationErrorCode code) => new(effect.Id, effect.BaseConversationVersion, code);
    }

    /// <summary>
    /// Seeds authoritative state through ordinary Kernel mutations (never by poking fields), for
    /// the few starting states the current policy cannot reach by itself in a scripted turn.
    /// </summary>
    public void SeedState(
        ConversationPhase phase,
        IReadOnlyList<DomainMutation> mutations,
        IReadOnlySet<ConversationAction>? allowedActions = null,
        params ConversationFact[] facts)
    {
        var transition = StateTransition.MoveTo(
            phase,
            GenerationStatus.Idle,
            allowedActions ?? new HashSet<ConversationAction> { ConversationAction.SendMessage },
            addFacts: new HashSet<ConversationFact>(facts),
            mutations: mutations);
        Conversation.ApplyTransition(transition, FixedLocalNow.ToUniversalTime(), EffectLease);
    }

    public string Transcript() => string.Join(
        "\n",
        Conversation.Messages.Select(m =>
            $"{(m.Role == ConversationMessageRole.User ? "User" : "Assistant")}: {m.Content}"));

    /// <summary>Same wiring as the module's DependencyInjection, minus store/usage/quota.</summary>
    public static ModelTurnRuntime BuildRuntime(
        IModelGateway gateway,
        ILogger<ModelTurnRuntime>? logger = null,
        AiCoachModuleOptions? options = null)
    {
        var prompts = new PromptModuleRegistry();
        prompts.Register(ExecutionPromptModules.Profile);
        prompts.Register(ExecutionPromptModules.LegacyProfile);
        prompts.Register(CompanionPromptModules.LegacyProfile);
        prompts.Register(CompanionPromptModules.V4Profile);
        prompts.Register(CompanionPromptModules.Profile);
        prompts.Register(ClarifyPromptModules.Profile);

        return new ModelTurnRuntime(
            gateway,
            new ModelContextBuilder(new ModelPromptAssembler(prompts)),
            new ConversationPrePolicy(),
            new ConversationPostPolicy(),
            new EvidenceGuard(),
            new PlanningAuthorityCalculator(),
            new SupportPolicyCalculator(),
            new DeterministicProposalGenerator(),
            new ResponseGuard(),
            new ProposalSetGuard(),
            Options.Create(options ?? new AiCoachModuleOptions()),
            logger ?? NullLogger<ModelTurnRuntime>.Instance);
    }
}

/// <summary>Returns the scripted outputs in order; the last one repeats for any further call.</summary>
public sealed class ScriptedGateway(params string[] outputs) : IModelGateway
{
    private readonly List<ModelGatewayRequest> _requests = [];

    public int CallCount => _requests.Count;

    public IReadOnlyList<ModelGatewayRequest> Requests => _requests;

    public Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
    {
        var output = outputs[Math.Min(_requests.Count, outputs.Length - 1)];
        _requests.Add(request);
        return Task.FromResult(new ModelCompletionResult(output, [], ModelFinishReason.Stop, 100, 50, 150));
    }
}

/// <summary>Wraps any gateway and keeps every request/raw-output pair for failure diagnostics.</summary>
public sealed class RecordingGateway(IModelGateway inner) : IModelGateway
{
    private readonly List<RecordedModelCall> _calls = [];

    public IReadOnlyList<RecordedModelCall> Calls => _calls;

    public async Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
    {
        var completion = await inner.CompleteAsync(request, cancellationToken);
        _calls.Add(new RecordedModelCall(request, completion.AssistantText));
        return completion;
    }
}

/// <summary>
/// The real Azure gateway against the deployed model. Credentials come from
/// blotztask-api/appsettings.Development.json (a dev machine); anywhere else the live layer
/// reports "not run" instead of passing (§17). Set AICOACH_MODEL_TESTS=0 to skip locally.
/// </summary>
public static class LiveModelGateway
{
    public static IModelGateway? TryCreate(out string? deploymentId)
    {
        deploymentId = null;
        if (Environment.GetEnvironmentVariable("AICOACH_MODEL_TESTS") == "0")
            return null;

        var credentials = TryLoadAzureCredentials();
        if (credentials is null)
            return null;

        var (endpoint, apiKey, deployment) = credentials.Value;
        deploymentId = deployment;
        var options = Options.Create(new AiCoachModuleOptions { DeploymentId = deployment });
        return new AzureOpenAiModelGateway(
            new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey)), options);
    }

    private static (string Endpoint, string ApiKey, string DeploymentId)? TryLoadAzureCredentials()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            var path = Path.Combine(dir.FullName, "blotztask-api", "appsettings.Development.json");
            if (!File.Exists(path)) continue;

            using var json = JsonDocument.Parse(File.ReadAllText(path));
            if (!json.RootElement.TryGetProperty("AzureOpenAI", out var azure)) return null;
            var endpoint = azure.TryGetProperty("Endpoint", out var e) ? e.GetString() : null;
            var apiKey = azure.TryGetProperty("ApiKey", out var k) ? k.GetString() : null;
            var deployment = azure.TryGetProperty("AiModels", out var models)
                             && models.TryGetProperty("TaskGeneration", out var task)
                             && task.TryGetProperty("DeploymentId", out var d)
                ? d.GetString()
                : null;

            return string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey)
                   || string.IsNullOrWhiteSpace(deployment)
                ? null
                : (endpoint!, apiKey!, deployment!);
        }

        return null;
    }
}

/// <summary>
/// Builds raw model output JSON for the scripted layer, in the exact wire shape of
/// ModelTurnCandidateContract (schema 6), so a scripted candidate goes through the same parser as
/// a real one. Schema 6 adds interpretation.planningReferences and actionRequest.referencedItemKey
/// (Clarify: selecting/rejecting a retained planning item by its ephemeral frame key).
/// </summary>
public static class Candidate
{
    private static readonly JsonSerializerOptions Json = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static string Turn(
        string intent,
        string suggestedAction,
        string responseType,
        string text,
        string? question = null,
        string? questionTopic = null,
        string? supportMove = null,
        object[]? planningItems = null,
        object[]? constraints = null,
        (string Kind, string? Quote)? disposition = null,
        (string Kind, string? Quote)? actionRequest = null,
        (string Kind, string? Quote, string Scope)? supportRequest = null,
        object[]? proposals = null,
        object[]? planningReferences = null,
        string? referencedItemKey = null,
        object? proposalSetMutation = null)
    {
        return JsonSerializer.Serialize(new
        {
            interpretation = new
            {
                intent,
                planningItems = planningItems ?? [],
                constraints = constraints ?? [],
                planningReferences = planningReferences ?? [],
                disposition = new
                {
                    kind = disposition?.Kind ?? "not_applicable",
                    evidence = Evidence(disposition?.Quote),
                },
                actionRequest = new
                {
                    kind = actionRequest?.Kind ?? "none",
                    evidence = Evidence(actionRequest?.Quote),
                    referencedItemKey,
                },
                supportRequest = new
                {
                    kind = supportRequest?.Kind ?? "unspecified",
                    evidence = Evidence(supportRequest?.Quote),
                    scope = supportRequest?.Scope ?? "turn",
                },
            },
            suggestedAction,
            response = new { type = responseType, text, question, questionTopic, supportMove },
            proposalSet = proposals is null ? null : (object)new { proposals },
            proposalSetMutation,
        }, Json);
    }

    public static string Listening(
        string text,
        string intent = "emotional",
        string? supportMove = "reflect",
        object[]? planningItems = null,
        object[]? constraints = null,
        (string Kind, string? Quote)? disposition = null,
        (string Kind, string? Quote)? actionRequest = null,
        (string Kind, string? Quote, string Scope)? supportRequest = null,
        object[]? planningReferences = null) =>
        Turn(intent, "continue_listening", "listening", text,
            supportMove: supportMove, planningItems: planningItems, constraints: constraints,
            disposition: disposition, actionRequest: actionRequest, supportRequest: supportRequest,
            planningReferences: planningReferences);

    public static string GentleQuestion(
        string text,
        string question,
        string topic = "other",
        string intent = "emotional",
        (string Kind, string? Quote)? actionRequest = null,
        (string Kind, string? Quote, string Scope)? supportRequest = null) =>
        Turn(intent, "ask_gentle_question", "gentle_question", text, question, topic, "gentle_question",
            actionRequest: actionRequest, supportRequest: supportRequest);

    public static string ClarifyingQuestion(
        string text,
        string question,
        string topic = "concrete_step",
        string intent = "goal",
        object[]? planningItems = null,
        object[]? constraints = null,
        (string Kind, string? Quote)? disposition = null,
        (string Kind, string? Quote)? actionRequest = null,
        object[]? planningReferences = null) =>
        Turn(intent, "ask_clarifying_question", "clarifying_question", text, question, topic,
            planningItems: planningItems, constraints: constraints,
            disposition: disposition, actionRequest: actionRequest,
            planningReferences: planningReferences);

    public static string ProposalSet(
        string text,
        object[] proposals,
        string intent = "concrete_action",
        object[]? planningItems = null,
        object[]? constraints = null,
        (string Kind, string? Quote)? disposition = null,
        (string Kind, string? Quote)? actionRequest = null,
        (string Kind, string? Quote, string Scope)? supportRequest = null,
        string? supportMove = null,
        object[]? planningReferences = null,
        string? referencedItemKey = null) =>
        Turn(intent, "show_proposal_set", "proposal_introduction", text,
            supportMove: supportMove, planningItems: planningItems, constraints: constraints,
            disposition: disposition, actionRequest: actionRequest, supportRequest: supportRequest,
            proposals: proposals, planningReferences: planningReferences,
            referencedItemKey: referencedItemKey);

    /// <summary>Schema 5+: an atomic edit of the CURRENT pending card, never a second card.</summary>
    public static string UpdateProposalSet(
        string text,
        object[] operations,
        object[]? ambiguities = null,
        string intent = "concrete_action",
        (string Kind, string? Quote)? actionRequest = null,
        string? referencedItemKey = null) =>
        Turn(intent, "update_proposal_set", "proposal_update", text,
            actionRequest: actionRequest,
            referencedItemKey: referencedItemKey,
            proposalSetMutation: new
            {
                artifactReferenceKey = "current_card",
                operations,
                ambiguities = ambiguities ?? [],
            });

    /// <summary>Schema 5+: the model reports it cannot tell what to edit — one question, no partial apply.</summary>
    public static string AmbiguousProposalSetUpdate(
        string text,
        string question,
        object[] ambiguities,
        string topic = "other",
        string intent = "concrete_action") =>
        Turn(intent, "ask_clarifying_question", "clarifying_question", text, question, topic,
            proposalSetMutation: new
            {
                artifactReferenceKey = "current_card",
                operations = Array.Empty<object>(),
                ambiguities,
            });

    public static object Item(string text, string quote, string kind = "action") =>
        new { text, kind, evidence = new { quote } };

    public static object Constraint(string text, string quote) =>
        new { text, evidence = new { quote } };

    /// <summary>Schema 6: points at a retained planning item by its ephemeral frame key.</summary>
    public static object Reference(string referenceKey, string kind, string quote) =>
        new { referenceKey, kind, evidence = new { quote } };

    public static object UpdateOperation(
        string targetReferenceKey,
        string[] changedFields,
        string quote,
        string? title = null,
        string? description = null,
        string? date = null,
        string? startTime = null,
        string? endTime = null,
        string operationKey = "op1") =>
        new
        {
            kind = "update",
            operationKey,
            targetReferenceKey,
            changedFields,
            title,
            description,
            date,
            startTime,
            endTime,
            labelId = (int?)null,
            evidence = new { quote },
        };

    public static object Ambiguity(
        string kind,
        string[] candidateReferenceKeys,
        string quote,
        string? field = null) =>
        new { kind, candidateReferenceKeys, field, evidence = new { quote } };

    public static object Proposal(
        string title,
        string date,
        string startTime,
        string endTime,
        string? description = null,
        string clientProposalKey = "p1") =>
        new { clientProposalKey, title, description, date, startTime, endTime, labelId = (int?)null };

    private static object? Evidence(string? quote) => quote is null ? null : new { quote };
}

/// <summary>Reusable seeded starting states for multi-turn cases.</summary>
public static class ScriptedTurns
{
    /// <summary>Execution: a verified direct instruction -> one pending card (through the real pipeline).</summary>
    public static async Task<EvalTurnResult> ExecutionPendingCard(
        AiCoachEvalHarness harness,
        string userMessage = "帮我安排明天早上跑步",
        string title = "跑步",
        string quote = "明天早上跑步",
        string date = "2026-09-15",
        string startTime = "07:00",
        string endTime = "07:30")
    {
        var scripted = Candidate.ProposalSet(
            "我建议明早七点跑半小时，你可以在卡片里调整。",
            [Candidate.Proposal(title, date, startTime, endTime)],
            planningItems: [Candidate.Item(title, quote)],
            actionRequest: ("direct_instruction", userMessage));
        return await RunScriptedAsync(harness, userMessage, scripted);
    }

    /// <summary>Companion: an emotional message answered with one accepted gentle question.</summary>
    public static async Task<EvalTurnResult> CompanionGentleQuestion(
        AiCoachEvalHarness harness,
        string userMessage,
        string question)
    {
        var scripted = Candidate.GentleQuestion(question, question);
        return await RunScriptedAsync(harness, userMessage, scripted);
    }

    /// <summary>
    /// Execution: a goal with an open clarifying question and a spent clarification slot. Under
    /// execution-planning-v2 a verified goal is immediately proposal-ready (conservative goal
    /// proposals are on), so the policy converts any question into a proposal regeneration — this
    /// state is only reachable by seeding, which the existing live delegation test does too.
    /// </summary>
    public static void SeedExecutionGoalWithOpenQuestion(
        AiCoachEvalHarness harness,
        string userMessage = "我想两周内完成论文摘要",
        string question = "你想先从哪件具体的事开始？",
        bool withConstraint = true)
    {
        var messageId = Guid.NewGuid();
        var intentId = Guid.NewGuid();
        var intent = new ActivePlanningIntentSnapshot(
            intentId,
            messageId,
            [new PlanningItemSnapshot("论文摘要", "完成论文摘要", messageId, PlanningItemKind.Goal)],
            withConstraint ? [new PlanningConstraintSnapshot("两周内", "两周内", messageId)] : [],
            PlanningIntentStatus.Collecting);

        harness.SeedState(
            ConversationPhase.ActionPreparing,
            [
                new AppendUserMessageMutation(messageId, userMessage),
                new UpsertPlanningIntentMutation(intent),
                new AppendAssistantMessageMutation(question, ConversationStrategy.AskClarifyingQuestion),
                new SetOpenQuestionMutation(question, intentId, ClarificationTopic.ConcreteStep),
                new RecordClarificationAttemptMutation(intentId, ClarificationTopic.ConcreteStep),
            ],
            facts: ConversationFact.HasOpenQuestion);
    }

    /// <summary>
    /// Clarify: an active intent whose clarification budget (2, clarification-planning-v3) is
    /// spent. <paramref name="withMaterial"/> false leaves the intent empty, which is the
    /// "exhausted with nothing verified" case where the server must NOT invent a goal.
    /// </summary>
    public static Guid SeedClarifyExhaustedClarifications(
        AiCoachEvalHarness harness,
        string userMessage = "我最近状态很乱，想理一理。",
        bool withMaterial = true,
        string goal = "把论文进度理顺",
        string goalQuote = "想理一理",
        string? currentState = null,
        string? topic = null,
        string lastQuestion = "你希望先理清哪一块？")
    {
        var messageId = Guid.NewGuid();
        var intentId = Guid.NewGuid();
        var items = new List<PlanningItemSnapshot>();
        if (withMaterial)
        {
            items.Add(new PlanningItemSnapshot(goal, goalQuote, messageId, PlanningItemKind.Goal, Guid.NewGuid()));
            if (topic is not null)
                items.Add(new PlanningItemSnapshot(topic, topic, messageId, PlanningItemKind.Domain, Guid.NewGuid()));
        }

        var intent = new ActivePlanningIntentSnapshot(
            intentId,
            messageId,
            items,
            withMaterial && currentState is not null
                ? [new PlanningConstraintSnapshot(currentState, currentState, messageId)]
                : [],
            PlanningIntentStatus.Collecting);

        harness.SeedState(
            ConversationPhase.ActionPreparing,
            [
                new AppendUserMessageMutation(messageId, userMessage),
                new UpsertPlanningIntentMutation(intent),
                new AppendAssistantMessageMutation(lastQuestion, ConversationStrategy.AskClarifyingQuestion),
                new SetOpenQuestionMutation(lastQuestion, intentId, ClarificationTopic.Scope),
                new RecordClarificationAttemptMutation(intentId, ClarificationTopic.ConcreteStep),
                new RecordClarificationAttemptMutation(intentId, ClarificationTopic.Scope),
            ],
            facts: ConversationFact.HasOpenQuestion);

        return intentId;
    }

    /// <summary>
    /// Clarify: an active intent with two retained, still-open items and budget left — the state
    /// a planningReference ("就第一个吧" / "第二个不要") is meant to resolve. The frame projects
    /// them as planning_item_1 / planning_item_2 in declaration order.
    /// </summary>
    public static Guid SeedClarifyTwoOpenItems(
        AiCoachEvalHarness harness,
        string userMessage = "我想把论文和实习都安排一下。",
        string firstItem = "写论文摘要",
        string secondItem = "投实习简历",
        string lastQuestion = "这两件事你想先推进哪一件？")
    {
        var messageId = Guid.NewGuid();
        var intentId = Guid.NewGuid();
        var intent = new ActivePlanningIntentSnapshot(
            intentId,
            messageId,
            [
                new PlanningItemSnapshot(firstItem, firstItem, messageId, PlanningItemKind.Action, Guid.NewGuid()),
                new PlanningItemSnapshot(secondItem, secondItem, messageId, PlanningItemKind.Action, Guid.NewGuid()),
            ],
            [],
            PlanningIntentStatus.Collecting);

        harness.SeedState(
            ConversationPhase.ActionPreparing,
            [
                new AppendUserMessageMutation(messageId, userMessage),
                new UpsertPlanningIntentMutation(intent),
                new AppendAssistantMessageMutation(lastQuestion, ConversationStrategy.AskClarifyingQuestion),
                new SetOpenQuestionMutation(lastQuestion, intentId, ClarificationTopic.Priority),
                new RecordClarificationAttemptMutation(intentId, ClarificationTopic.Priority),
            ],
            facts: ConversationFact.HasOpenQuestion);

        return intentId;
    }

    /// <summary>Clarify: a verified planning request answered with one pending card.</summary>
    public static Task<EvalTurnResult> ClarifyPendingCard(
        AiCoachEvalHarness harness,
        string userMessage = "你直接帮我安排明天下午两点写论文摘要吧。",
        string title = "写论文摘要",
        string date = "2026-09-15",
        string startTime = "14:00",
        string endTime = "14:30")
    {
        var scripted = Candidate.ProposalSet(
            "先放一个草稿，你可以改。",
            [Candidate.Proposal(title, date, startTime, endTime)],
            planningItems: [Candidate.Item(title, title)],
            actionRequest: ("explicit_planning_request", userMessage));
        return RunScriptedAsync(harness, userMessage, scripted);
    }

    public static async Task<EvalTurnResult> RunScriptedAsync(
        AiCoachEvalHarness harness,
        string userMessage,
        params string[] scriptedOutputs)
    {
        var original = harness.Gateway;
        harness.Gateway = new ScriptedGateway(scriptedOutputs);
        try
        {
            return await harness.RunTurnAsync(userMessage);
        }
        finally
        {
            harness.Gateway = original;
        }
    }
}

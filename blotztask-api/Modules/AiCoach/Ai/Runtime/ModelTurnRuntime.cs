using BlotzTask.Modules.AiCoach.Ai.Contracts;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Guards;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Ai.Runtime;

public sealed record ModelTurnRequest(
    ConversationSnapshot Snapshot,
    Guid EffectId,
    AiCoachModeDefinition Mode,
    IReadOnlyList<ConversationMessage> RecentMessages,
    string TimeZoneId,
    DateTimeOffset UserLocalNow);

public enum ModelTurnCompletionReason
{
    Completed = 0,
    IterationLimitExceeded = 1,
    ContentFiltered = 2,
    InvalidModelResponse = 3,
    TimedOut = 4,
    Cancelled = 5,
    ModelUnavailable = 6,
}

public sealed record ModelTurnRunResult(
    ModelTurnCompletionReason CompletionReason,
    ValidatedTurnOutcome? Outcome,
    int InputTokens,
    int OutputTokens,
    int TotalTokens);

public interface IModelTurnRuntime
{
    Task<ModelTurnRunResult> ExecuteAsync(ModelTurnRequest request, CancellationToken cancellationToken);
}

/// <summary>
/// The Single-Turn Model Runtime (v3 tech design §5/§7.2): Pre-Policy envelope -> deterministic
/// Model Context -> bounded model call(s) -> Model Output Schema Guard -> Evidence Guard ->
/// Post-Policy -> Response Guard -> ProposalSet Guard, folding everything into ONE
/// <see cref="ValidatedTurnOutcome"/>. It never touches conversation state or the store — the
/// Application layer turns its result into a Kernel event.
///
/// Iteration budget (v3 §21): schema corrections and regenerations share MaxModelIterations —
/// they never stack on top of it. v1 registers no read-only tools, so the tool loop of §16 does
/// not run; its budget rules are already honoured by this shared counter.
/// </summary>
public sealed class ModelTurnRuntime(
    IModelGateway gateway,
    IModelContextBuilder contextBuilder,
    IConversationPrePolicy prePolicy,
    IConversationPostPolicy postPolicy,
    IEvidenceGuard evidenceGuard,
    IResponseGuard responseGuard,
    IProposalSetGuard proposalSetGuard,
    IOptions<AiCoachModuleOptions> options,
    ILogger<ModelTurnRuntime> logger) : IModelTurnRuntime
{
    public async Task<ModelTurnRunResult> ExecuteAsync(ModelTurnRequest request, CancellationToken cancellationToken)
    {
        var limits = options.Value;
        var snapshot = request.Snapshot;
        var envelope = prePolicy.Build(snapshot, request.Mode);

        var context = contextBuilder.Build(new ModelContextRequest(
            snapshot, request.Mode, envelope, request.RecentMessages, request.TimeZoneId, request.UserLocalNow));

        var currentUser = request.RecentMessages
            .LastOrDefault(m => m.Role == ConversationMessageRole.User);
        var currentUserMessage = currentUser?.Content ?? string.Empty;

        // Corrections/regenerations extend this transcript so the model sees what it got wrong.
        var transcript = new List<GatewayMessage>(context.Transcript);

        var iterations = 0;
        var schemaCorrections = 0;
        var regenerations = 0;
        var proposalRegenerations = 0;
        var proposalRequired = false;
        int inputTokens = 0, outputTokens = 0, totalTokens = 0;

        while (iterations < limits.MaxModelIterations)
        {
            iterations++;

            ModelCompletionResult completion;
            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeout.CancelAfter(TimeSpan.FromSeconds(limits.ModelRequestTimeoutSeconds));
                completion = await gateway.CompleteAsync(
                    new ModelGatewayRequest(
                        context.SystemPrompt,
                        transcript,
                        Tools: [],
                        ResponseFormat: new ResponseFormatSpec(
                            ModelTurnCandidateContract.ResponseFormatName,
                            ModelTurnCandidateContract.JsonSchema)),
                    timeout.Token);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                return Fail(ModelTurnCompletionReason.Cancelled);
            }
            catch (OperationCanceledException)
            {
                return Fail(ModelTurnCompletionReason.TimedOut);
            }

            inputTokens += completion.InputTokens;
            outputTokens += completion.OutputTokens;
            totalTokens += completion.TotalTokens;

            // Token visibility per gateway call: the whole system prompt + transcript is re-sent
            // every iteration, so per-call numbers show what each resend costs.
            logger.LogInformation(
                "AiCoach model call: conversation {ConversationId} iteration {Iteration} in={InputTokens} out={OutputTokens}",
                snapshot.ConversationId, iterations, completion.InputTokens, completion.OutputTokens);

            if (completion.FinishReason == ModelFinishReason.ContentFilter)
                return Fail(ModelTurnCompletionReason.ContentFiltered);

            // ---- Model Output Schema Guard (one correction attempt, v3 §21) ----
            var parsed = ModelTurnCandidateContract.Parse(completion.AssistantText);
            if (!parsed.IsSuccess)
            {
                schemaCorrections++;
                if (schemaCorrections > limits.MaxSchemaCorrectionAttempts || iterations >= limits.MaxModelIterations)
                    return Fail(ModelTurnCompletionReason.InvalidModelResponse);

                logger.LogWarning(
                    "AiCoach schema correction for conversation {ConversationId}: {Error}",
                    snapshot.ConversationId, parsed.Error);
                AppendCorrection(transcript, completion.AssistantText,
                    $"[system] Your output was invalid: {parsed.Error} Respond again following the required format exactly.");
                continue;
            }

            var candidate = parsed.Candidate!;

            // ---- Evidence Guard -> Post-Policy ----
            var evidence = evidenceGuard.Verify(candidate.Signals, currentUserMessage);
            logger.LogInformation(
                "AiCoach pipeline candidate conversation={ConversationId} iteration={Iteration} user={UserMessage} strategy={Strategy} intent={Intent} actionIntent={ActionIntent} coachDecompose={CoachDecompose} disposition={Disposition} planningItems={PlanningItems} activeIntent={ActiveIntent} openQuestion={OpenQuestion}",
                snapshot.ConversationId,
                iterations,
                TruncateForLog(currentUserMessage),
                candidate.StrategyCandidate,
                candidate.Signals.Intent,
                candidate.Signals.UserExpressedActionIntent,
                candidate.Signals.CoachDecompositionAuthorized,
                candidate.Signals.ClarificationDisposition,
                FormatPlanningItems(candidate.Signals.PlanningItems),
                FormatPlanningItems(snapshot.ActivePlanningIntent?.Items),
                snapshot.OpenQuestion is not null);
            logger.LogInformation(
                "AiCoach pipeline evidence conversation={ConversationId} iteration={Iteration} actionVerified={ActionVerified} actionItems={ActionItems} coachDecomposeVerified={CoachDecomposeVerified} constraint={Constraint} detail={Detail}",
                snapshot.ConversationId,
                iterations,
                evidence.ActionIntentVerified,
                FormatPlanningItems(evidence.ActionItems),
                evidence.CoachDecompositionAuthorized,
                evidence.Constraint,
                evidence.Detail);
            if (evidence is { ActionIntentVerified: false, Detail: not null })
                logger.LogInformation(
                    "AiCoach evidence not verified for conversation {ConversationId}: {Detail}",
                    snapshot.ConversationId, evidence.Detail);

            var decision = postPolicy.Decide(new PolicyContext(
                snapshot,
                envelope,
                candidate,
                request.Mode,
                evidence.ActionIntentVerified,
                evidence.PlanningItems.Count > 0
                && evidence.PlanningItems.All(item => item.Kind is PlanningItemKind.Goal or PlanningItemKind.Domain)));
            if (proposalRequired && candidate.StrategyCandidate != ConversationStrategy.ShowProposalSet)
            {
                decision = new StrategyDecision(
                    ConversationStrategy.ShowProposalSet,
                    StrategyDecisionType.RequiresRegeneration,
                    StrategyReasonCode.ClarificationResolvedRequiresProposal,
                    AcceptResponseCandidate: false,
                    AcceptProposalSetCandidate: false);
            }
            logger.LogInformation(
                "AiCoach pipeline policy conversation={ConversationId} iteration={Iteration} allowed={AllowedStrategies} final={FinalStrategy} decision={Decision} reason={Reason} acceptResponse={AcceptResponse} acceptProposal={AcceptProposal}",
                snapshot.ConversationId,
                iterations,
                string.Join(",", envelope.AllowedStrategies),
                decision.FinalStrategy,
                decision.DecisionType,
                decision.ReasonCode,
                decision.AcceptResponseCandidate,
                decision.AcceptProposalSetCandidate);

            if (decision.DecisionType == StrategyDecisionType.RequiresRegeneration)
            {
                if (decision.ReasonCode is StrategyReasonCode.ClarificationSlotAlreadyAsked
                    or StrategyReasonCode.ClarificationResolvedRequiresProposal
                    or StrategyReasonCode.ActionableIntentRequiresProposal)
                    proposalRequired = true;
                regenerations++;
                if (regenerations <= limits.MaxRegenerationAttempts && iterations < limits.MaxModelIterations)
                {
                    logger.LogWarning(
                        "AiCoach regeneration for conversation {ConversationId}: {Reason}",
                        snapshot.ConversationId, decision.ReasonCode);
                    AppendCorrection(
                        transcript,
                        completion.AssistantText,
                        decision.ReasonCode is StrategyReasonCode.ClarificationSlotAlreadyAsked
                            or StrategyReasonCode.ActionableIntentRequiresProposal
                            or StrategyReasonCode.ClarificationResolvedRequiresProposal
                            ? "[system] This planning intent has already used its one clarification slot. "
                              + "Do not ask or rephrase another question. Use the active user-verified planning items and constraint "
                              + "from the execution frame, choose safe defaults, and return show_proposal_set."
                            : "[system] Your response.type did not match your strategy (or a required field was missing). "
                              + "Pick the strategy again and make the response type match it exactly.");
                    continue;
                }

                // Regeneration budget exhausted: deterministic safe fallback instead of an error.
                    return Complete(FallbackOutcome(
                        StrategyReasonCode.ModelResponseInvalid,
                        envelope,
                        snapshot,
                        evidence,
                        currentUser?.Id,
                        candidate.Signals.ClarificationDisposition,
                        currentUserMessage,
                        request.TimeZoneId,
                        request.UserLocalNow));
            }

            // ---- Response Guard ----
            if (decision.AcceptResponseCandidate)
            {
                var responseVerdict = responseGuard.Validate(
                    candidate.ResponseCandidate, envelope.ResponseConstraints);
                if (!responseVerdict.IsValid)
                {
                    logger.LogWarning(
                        "AiCoach response guard rejected candidate for conversation {ConversationId}: {Detail}",
                        snapshot.ConversationId, responseVerdict.Detail);
                    return Complete(FallbackOutcome(
                        StrategyReasonCode.ResponseInvalid,
                        envelope,
                        snapshot,
                        evidence,
                        currentUser?.Id,
                        candidate.Signals.ClarificationDisposition,
                        currentUserMessage,
                        request.TimeZoneId,
                        request.UserLocalNow));
                }
            }

            // ---- ProposalSet Guard (only when Post-Policy accepted the proposal path) ----
            IReadOnlyList<Domain.Proposals.TaskProposal>? acceptedProposals = null;
            var finalStrategy = decision.FinalStrategy;
            var reasonCode = decision.ReasonCode;
            var fallbackUsed = decision.DecisionType == StrategyDecisionType.Downgraded;
            var deterministicProposalUsed = false;

            if (decision.AcceptProposalSetCandidate && candidate.ProposalSetCandidate is not null)
            {
                var verdict = proposalSetGuard.Validate(
                    candidate.ProposalSetCandidate, snapshot, envelope.ProposalConstraints, request.TimeZoneId);
                if (verdict.IsValid)
                {
                    acceptedProposals = verdict.Proposals;
                }
                else
                {
                    logger.LogInformation(
                        "AiCoach pipeline proposal-guard conversation={ConversationId} iteration={Iteration} regeneration={Regeneration} valid=false detail={Detail}",
                        snapshot.ConversationId,
                        iterations,
                        proposalRegenerations,
                        verdict.Detail);
                    logger.LogWarning(
                        "AiCoach proposal set rejected for conversation {ConversationId}: {Detail}",
                        snapshot.ConversationId, verdict.Detail);
                    if (proposalRegenerations < limits.MaxRegenerationAttempts
                        && iterations < limits.MaxModelIterations)
                    {
                        proposalRegenerations++;
                        AppendCorrection(
                            transcript,
                            completion.AssistantText,
                            "[system] The proposal card failed server validation. Keep every verified planning item, "
                            + "use a future local time in the user's timezone, avoid the past and default overnight hours, "
                            + "and return a complete show_proposal_set with valid start/end times.");
                        continue;
                    }

                    // Invalid cards are never partially accepted. After the bounded retry, keep
                    // the verified intent and build a minimal safe card from it.
                    var safeProposals = BuildDeterministicProposals(
                        snapshot, evidence, request.TimeZoneId, request.UserLocalNow);
                    if (safeProposals.Count > 0)
                    {
                        logger.LogInformation(
                            "AiCoach pipeline deterministic-proposal conversation={ConversationId} count={Count} localNow={LocalNow}",
                            snapshot.ConversationId,
                            safeProposals.Count,
                            request.UserLocalNow);
                        acceptedProposals = safeProposals;
                        finalStrategy = ConversationStrategy.ShowProposalSet;
                        reasonCode = StrategyReasonCode.ProposalSetInvalid;
                        fallbackUsed = true;
                        deterministicProposalUsed = true;
                    }
                    else
                    {
                    var mayAsk = snapshot.OpenQuestion is null;
                    finalStrategy = mayAsk
                        ? ConversationStrategy.AskClarifyingQuestion
                        : ConversationStrategy.ContinueListening;
                    reasonCode = mayAsk
                        ? StrategyReasonCode.ProposalSetInvalid
                        : StrategyReasonCode.ClarificationSlotAlreadyAsked;
                    fallbackUsed = true;
                    }
                }
            }

            var text = fallbackUsed
                ? deterministicProposalUsed
                    ? BuildDeterministicProposalText(currentUserMessage, request.UserLocalNow)
                    : FallbackCatalog.For(
                    reasonCode,
                    currentUserMessage,
                    allowQuestion: finalStrategy.AsksQuestion())
                : candidate.ResponseCandidate.Text;

            var question = fallbackUsed
                ? (finalStrategy.AsksQuestion() ? text : null)
                : QuestionOf(candidate.ResponseCandidate);
            var questionTopic = QuestionTopicOf(candidate.ResponseCandidate);
            var clarificationResolution = ToResolution(candidate.Signals.ClarificationDisposition);
            var planningIntentUpdate = BuildPlanningIntentUpdate(
                snapshot,
                evidence,
                currentUser?.Id,
                acceptedProposals is not null,
                clarificationResolution);

            logger.LogInformation(
                "AiCoach turn decided: conversation {ConversationId} candidate={Candidate} final={Final} decision={Decision} reason={Reason} proposals={Proposals} fallback={Fallback}",
                snapshot.ConversationId, candidate.StrategyCandidate, finalStrategy, decision.DecisionType,
                reasonCode, acceptedProposals?.Count ?? 0, fallbackUsed);
            logger.LogInformation(
                "AiCoach pipeline outcome conversation={ConversationId} strategy={Strategy} proposals={Proposals} fallback={Fallback} deterministicProposal={DeterministicProposal} intentUpdate={IntentUpdate} clarificationResolution={ClarificationResolution} text={Text}",
                snapshot.ConversationId,
                finalStrategy,
                acceptedProposals?.Count ?? 0,
                fallbackUsed,
                deterministicProposalUsed,
                planningIntentUpdate is not null,
                clarificationResolution,
                TruncateForLog(text));

            return Complete(new ValidatedTurnOutcome(
                finalStrategy,
                decision.DecisionType,
                reasonCode,
                text,
                question,
                acceptedProposals,
                fallbackUsed,
                planningIntentUpdate,
                questionTopic,
                clarificationResolution));
        }

        logger.LogWarning(
            "Model turn hit iteration limit for conversation {ConversationId} (effect {EffectId})",
            snapshot.ConversationId, request.EffectId);
        return Fail(ModelTurnCompletionReason.IterationLimitExceeded);

        ModelTurnRunResult Fail(ModelTurnCompletionReason reason) =>
            new(reason, null, inputTokens, outputTokens, totalTokens);

        ModelTurnRunResult Complete(ValidatedTurnOutcome outcome) =>
            new(ModelTurnCompletionReason.Completed, outcome, inputTokens, outputTokens, totalTokens);
    }

    private static void AppendCorrection(List<GatewayMessage> transcript, string? rawOutput, string note)
    {
        transcript.Add(new GatewayAssistantMessage(rawOutput ?? string.Empty, []));
        transcript.Add(new GatewayUserMessage(note));
    }

    private static ActivePlanningIntentSnapshot? BuildPlanningIntentUpdate(
        ConversationSnapshot snapshot,
        EvidenceVerdict evidence,
        Guid? currentMessageId,
        bool proposalAccepted,
        ClarificationResolution? clarificationResolution)
    {
        if (currentMessageId is null)
            return null;

        var current = snapshot.ActivePlanningIntent;
        var coachMayDecompose = evidence.CoachDecompositionAuthorized || clarificationResolution is not null;
        if (current is null && evidence.PlanningItems.Count == 0)
            return null;

        var intentId = current?.IntentId ?? Guid.NewGuid();
        var sourceItems = evidence.PlanningItems;
        var items = (current?.Items ?? [])
            .Concat(sourceItems.Select(item => new PlanningItemSnapshot(
                item.Text,
                item.EvidenceQuote,
                currentMessageId.Value,
                item.Kind)))
            .GroupBy(item => item.Text, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.Last())
            .ToList();

        return new ActivePlanningIntentSnapshot(
            intentId,
            current?.SourceMessageId ?? currentMessageId.Value,
            items,
            evidence.Constraint ?? current?.Constraint,
            PlanningStateRules.NextIntentStatus(
                current?.Status ?? PlanningIntentStatus.Collecting,
                clarificationResolution,
                proposalAccepted),
            current?.AskedTopics,
            evidence.ActionIntentVerified || coachMayDecompose || current?.HasExplicitActionIntent == true,
            evidence.ConstraintEvidenceQuote ?? current?.ConstraintEvidenceQuote);
    }

    private static ClarificationResolution? ToResolution(ClarificationDisposition disposition) => disposition switch
    {
        ClarificationDisposition.Answered => ClarificationResolution.Answered,
        ClarificationDisposition.CannotProvide => ClarificationResolution.UserCannotProvide,
        ClarificationDisposition.DelegatedToCoach => ClarificationResolution.DelegatedToCoach,
        ClarificationDisposition.RejectedQuestion => ClarificationResolution.Superseded,
        _ => null,
    };

    private static ValidatedTurnOutcome FallbackOutcome(
        StrategyReasonCode reason,
        StrategyEnvelope envelope,
        ConversationSnapshot snapshot,
        EvidenceVerdict evidence,
        Guid? currentMessageId,
        ClarificationDisposition disposition,
        string currentUserMessage,
        string timeZoneId,
        DateTimeOffset localNow)
    {
        var strategy = envelope.AllowedStrategies.Contains(ConversationStrategy.ShowProposalSet)
            && PlanningStateRules.CanGenerateProposal(snapshot)
            ? ConversationStrategy.ShowProposalSet
            : envelope.AllowedStrategies.Contains(ConversationStrategy.ContinueListening)
                ? ConversationStrategy.ContinueListening
                : envelope.AllowedStrategies.First();
        var resolution = ToResolution(disposition);
        var deterministicProposals = strategy == ConversationStrategy.ShowProposalSet
            ? BuildDeterministicProposals(snapshot, evidence, timeZoneId, localNow)
            : [];
        if (deterministicProposals.Count > 0)
        {
            return new ValidatedTurnOutcome(
                ConversationStrategy.ShowProposalSet,
                StrategyDecisionType.Downgraded,
                reason,
                BuildDeterministicProposalText(currentUserMessage, localNow),
                Question: null,
                AcceptedProposals: deterministicProposals,
                FallbackUsed: true,
                PlanningIntentUpdate: BuildPlanningIntentUpdate(
                    snapshot, evidence, currentMessageId, proposalAccepted: true, clarificationResolution: resolution),
                ClarificationResolution: resolution);
        }

        var text = FallbackCatalog.For(reason, currentUserMessage, allowQuestion: strategy.AsksQuestion());
        return new ValidatedTurnOutcome(
            strategy,
            StrategyDecisionType.Downgraded,
            reason,
            text,
            Question: null,
            AcceptedProposals: null,
            FallbackUsed: true,
            PlanningIntentUpdate: BuildPlanningIntentUpdate(
                snapshot, evidence, currentMessageId, proposalAccepted: false, clarificationResolution: resolution),
            ClarificationResolution: resolution);
    }

    private static string? QuestionOf(AssistantResponseCandidate response) => response switch
    {
        GentleQuestionResponse r => r.Question,
        ClarifyingQuestionResponse r => r.Question,
        GoalChoiceResponse r => r.Question,
        _ => null,
    };

    private static ClarificationTopic? QuestionTopicOf(AssistantResponseCandidate response) => response switch
    {
        GentleQuestionResponse r => r.Topic,
        ClarifyingQuestionResponse r => r.Topic,
        GoalChoiceResponse r => r.Topic,
        _ => null,
    };

    private static IReadOnlyList<Domain.Proposals.TaskProposal> BuildDeterministicProposals(
        ConversationSnapshot snapshot,
        EvidenceVerdict evidence,
        string timeZoneId,
        DateTimeOffset localNow)
    {
        var sourceItems = evidence.ActionItems.Count > 0
            ? evidence.ActionItems
            : evidence.PlanningItems;
        if (sourceItems.Count == 0 && snapshot.ActivePlanningIntent is not { Items.Count: > 0 })
            return [];

        var titles = sourceItems.Count > 0
            ? sourceItems.Select(item => item.Text).Distinct(StringComparer.OrdinalIgnoreCase).ToList()
            : snapshot.ActivePlanningIntent!.Items.Select(item => item.Text).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var start = TimeOnly.FromDateTime(localNow.LocalDateTime).AddMinutes(5);
        start = new TimeOnly(start.Hour, (start.Minute / 15 + 1) * 15);
        if (start >= new TimeOnly(23, 30))
            return [];
        var end = start.AddMinutes(30);
        return titles.Select((title, index) => new Domain.Proposals.TaskProposal(
            Guid.NewGuid(),
            title,
            "保守默认安排，可在卡片中调整。",
            DateOnly.FromDateTime(localNow.DateTime),
            start.AddMinutes(index * 30),
            end.AddMinutes(index * 30),
            timeZoneId,
            null)).ToList();
    }

    private static string BuildDeterministicProposalText(string currentUserMessage, DateTimeOffset localNow) =>
        ContainsCjk(currentUserMessage)
            ? $"我先按保守默认安排了一个起步方案，从 {localNow:HH:mm} 之后开始。你可以直接在卡片上确认或调整。"
            : $"I created a conservative starter plan after {localNow:HH:mm}. You can confirm or adjust it on the card.";

    private static bool ContainsCjk(string text) => text.Any(c => c >= 0x4E00 && c <= 0x9FFF);

    private static string TruncateForLog(string value) =>
        value.Length <= 160 ? value : value[..160] + "...";

    private static string FormatPlanningItems<T>(IEnumerable<T>? items) where T : notnull =>
        items is null
            ? "none"
            : string.Join(" | ", items.Select(item => item switch
            {
                PlanningItemCandidate candidate => $"{candidate.Kind}:{candidate.Text}",
                VerifiedPlanningItem verified => $"{verified.Kind}:{verified.Text}",
                PlanningItemSnapshot snapshot => $"{snapshot.Kind}:{snapshot.Text}",
                _ => item.ToString() ?? "unknown",
            }));
}

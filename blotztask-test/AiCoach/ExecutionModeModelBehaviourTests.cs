using Azure;
using Azure.AI.OpenAI;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.ModelTurn;
using BlotzTask.Modules.AiCoach.Ai.Prompts;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Capabilities;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using System.Text.Json;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach;

/// <summary>
/// LIVE model-behaviour tests (the seed of the per-mode scenario test suite): the REAL prompt
/// modules, frame builder, capability guard/dispatcher and Azure gateway, driven through the
/// real ModelTurnExecutor against the deployed model. They encode the user scenarios the prompt
/// must satisfy — including regressions like 2026-08-24 "帮我列出可能需要完成的任务" being
/// answered with the same clarifying question again instead of a draft.
///
/// They run only where blotztask-api/appsettings.Development.json has Azure OpenAI credentials
/// (i.e. a dev machine); anywhere else (CI) they no-op. Set AICOACH_MODEL_TESTS=0 to skip
/// locally. Each test is one model turn on gpt-*-mini — cost is negligible.
/// </summary>
public class ExecutionModeModelBehaviourTests(ITestOutputHelper output)
{
    // ---------- Scenarios ----------

    [Fact]
    public async Task Delegation_AfterOneClarifyingQuestion_ProducesDraft_NotTheSameQuestionAgain()
    {
        // Regression (2026-08-24 screenshot): user hands the decision to the model; the model
        // must create a card with the first small steps, never re-ask "你想先做哪一件具体的事".
        var result = await RunTurnAsync(
            ConversationState.Clarifying,
            clarificationRounds: 1,
            [
                User("我想要在两周内完成论文摘要"),
                Assistant("你想先从哪件具体的事开始？"),
                User("帮我列出可能需要完成的任务"),
            ]);
        if (result is null) return; // no credentials — skipped

        result.CompletionReason.Should().Be(ModelTurnCompletionReason.Completed, result.AssistantMessage);
        result.ProposedDraft.Should().NotBeNull(
            $"delegation must yield a draft card, but the model replied: \"{result.AssistantMessage}\"");
        result.ProposedDraft!.Items.Count.Should().BeInRange(2, 4, "a goal breaks into the first few small steps");
        result.AssistantMessage.Should().NotContain("哪件具体的事", "never repeat the clarifying question");
        output.WriteLine($"draft: {string.Join(" | ", result.ProposedDraft.Items.Select(i => $"{i.Title} {i.Date} {i.StartTime}"))}");
        output.WriteLine($"reply: {result.AssistantMessage}");
    }

    [Fact]
    public async Task SeveralConcreteThings_ProduceOneCard_WithATaskEach()
    {
        var result = await RunTurnAsync(
            ConversationState.Conversing,
            clarificationRounds: 0,
            [User("明天要上班，后天要去上学")]);
        if (result is null) return;

        result.CompletionReason.Should().Be(ModelTurnCompletionReason.Completed, result.AssistantMessage);
        result.ProposedDraft.Should().NotBeNull(
            $"the user named two concrete things, but the model replied: \"{result.AssistantMessage}\"");
        result.ProposedDraft!.Items.Should().HaveCount(2, "user said two things → two tasks on one card");
        output.WriteLine($"draft: {string.Join(" | ", result.ProposedDraft.Items.Select(i => $"{i.Title} {i.Date} {i.StartTime}-{i.EndTime}"))}");
    }

    [Fact]
    public async Task PureGoal_FirstTurn_AsksOneQuestion_NoDraft()
    {
        var result = await RunTurnAsync(
            ConversationState.Conversing,
            clarificationRounds: 0,
            [User("我想要在两周内完成论文摘要")]);
        if (result is null) return;

        result.CompletionReason.Should().Be(ModelTurnCompletionReason.Completed, result.AssistantMessage);
        result.ProposedDraft.Should().BeNull(
            $"a pure goal earns one clarifying question first, but the model created: " +
            $"{(result.ProposedDraft is null ? "-" : string.Join(", ", result.ProposedDraft.Items.Select(i => i.Title)))}");
        result.AssistantMessage.Should().Contain("？", "the whole reply is one question");
        output.WriteLine($"question: {result.AssistantMessage}");
    }

    // ---------- Real-pipeline harness ----------

    private static ConversationMessage User(string content) =>
        new(Guid.NewGuid(), ConversationMessageRole.User, content, DateTimeOffset.UtcNow);

    private static ConversationMessage Assistant(string content) =>
        new(Guid.NewGuid(), ConversationMessageRole.Assistant, content, DateTimeOffset.UtcNow);

    private async Task<ModelTurnResult?> RunTurnAsync(
        ConversationState state,
        int clarificationRounds,
        IReadOnlyList<ConversationMessage> messages)
    {
        var credentials = TryLoadAzureCredentials();
        if (credentials is null)
        {
            output.WriteLine("SKIPPED: no Azure OpenAI credentials (blotztask-api/appsettings.Development.json).");
            return null;
        }

        var (endpoint, apiKey, deploymentId) = credentials.Value;
        var options = Options.Create(new AiCoachModuleOptions { DeploymentId = deploymentId });

        var capabilityRegistry = new CapabilityRegistry();
        capabilityRegistry.Register(new CapabilityDefinition(
            Id: CapabilityId.DraftOneOffCreate,
            CapabilityVersion: 1,
            InputSchemaVersion: CreateTaskDraftsHandler.SchemaVersion,
            OutputSchemaVersion: 1,
            AllowedInvokers: new HashSet<CapabilityInvoker> { CapabilityInvoker.Model },
            AllowedModes: new HashSet<AiCoachMode> { AiCoachMode.Execution },
            AllowedStates: new HashSet<ConversationState>
            {
                ConversationState.Conversing,
                ConversationState.Clarifying,
                ConversationState.DraftPending,
            },
            AllowedCurrentArtifacts: new HashSet<ArtifactType> { ArtifactType.TaskDraft },
            ConsentRequirement: ConsentRequirement.None,
            ExecutionSemantics: CapabilityExecutionSemantics.ProposesArtifact,
            ConcurrencyPolicy: CapabilityConcurrencyPolicy.SequentialOnly,
            ToolName: CapabilityToolProjector.DraftToolName,
            ToolDescription: CapabilityToolProjector.DraftToolDescription,
            InputType: typeof(CreateTaskDraftsInput),
            HandlerType: typeof(CreateTaskDraftsHandler)));

        var promptRegistry = new PromptModuleRegistry();
        promptRegistry.Register(ExecutionPromptModules.Profile);

        var executor = new ModelTurnExecutor(
            new AzureOpenAiModelGateway(
                new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey)), options),
            new ModelPromptAssembler(promptRegistry),
            new ExecutionModeFrameBuilder(),
            capabilityRegistry,
            new CapabilityDispatcher(
                capabilityRegistry,
                new CapabilityGuard(capabilityRegistry),
                new CreateTaskDraftsHandler(),
                NullLogger<CapabilityDispatcher>.Instance),
            options,
            NullLogger<ModelTurnExecutor>.Instance);

        const string timeZoneId = "Australia/Sydney";
        var mode = ExecutionModeDefinition.Create();
        var snapshot = new ConversationSnapshot(
            Guid.NewGuid(), Guid.NewGuid(), AiCoachMode.Execution,
            ConversationLifecycleStatus.Active, state, GenerationStatus.Running, BlockedReason.None,
            Version: messages.Count,
            CurrentArtifact: null,
            Clarification: new ClarificationProgress(clarificationRounds),
            AllowedActions: new HashSet<ConversationAction>());

        var userLocalNow = TimeZoneInfo.ConvertTime(
            DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(timeZoneId));

        var result = await executor.ExecuteAsync(
            new ModelTurnRequest(snapshot, Guid.NewGuid(), mode, messages, timeZoneId, userLocalNow),
            CancellationToken.None);

        output.WriteLine($"tokens: in={result.InputTokens} out={result.OutputTokens} total={result.TotalTokens}");
        return result;
    }

    private static (string Endpoint, string ApiKey, string DeploymentId)? TryLoadAzureCredentials()
    {
        if (Environment.GetEnvironmentVariable("AICOACH_MODEL_TESTS") == "0")
            return null;

        // Walk up from the test bin folder to the repo root, then into blotztask-api.
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

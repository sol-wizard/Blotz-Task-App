using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Prompts;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Guards;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

/// <summary>
/// Single-Turn Runtime tests with a scripted fake gateway: the full deterministic pipeline
/// (Pre-Policy -> schema guard -> Evidence -> Post-Policy -> Response/ProposalSet guards)
/// without a real model.
/// </summary>
public class ModelTurnRuntimeTests
{
    private static readonly AiCoachModeDefinition Mode = ExecutionModeDefinition.Create();

    private sealed class ScriptedGateway(params string[] outputs) : IModelGateway
    {
        private int _calls;

        public IReadOnlyList<ModelGatewayRequest> Requests { get; } = new List<ModelGatewayRequest>();

        public Task<ModelCompletionResult> CompleteAsync(
            ModelGatewayRequest request, CancellationToken cancellationToken)
        {
            ((List<ModelGatewayRequest>)Requests).Add(request);
            var output = outputs[Math.Min(_calls, outputs.Length - 1)];
            _calls++;
            return Task.FromResult(new ModelCompletionResult(
                output, [], ModelFinishReason.Stop, 100, 50, 150));
        }
    }

    private static ModelTurnRuntime Runtime(IModelGateway gateway)
    {
        var promptRegistry = new PromptModuleRegistry();
        promptRegistry.Register(ExecutionPromptModules.Profile);

        return new ModelTurnRuntime(
            gateway,
            new ModelContextBuilder(new ModelPromptAssembler(promptRegistry)),
            new ConversationPrePolicy(),
            new ConversationPostPolicy(),
            new EvidenceGuard(),
            new ResponseGuard(),
            new ProposalSetGuard(),
            Options.Create(new AiCoachModuleOptions()),
            NullLogger<ModelTurnRuntime>.Instance);
    }

    private static ModelTurnRequest Request(string userMessage)
    {
        var snapshot = new ConversationSnapshot(
            Guid.NewGuid(), Guid.NewGuid(), AiCoachMode.Execution,
            ConversationPhase.Conversing, GenerationStatus.Running, BlockedReason.None, 1,
            null, null, new HashSet<ConversationFact>(), new HashSet<ConversationAction>(),
            Mode.ToRuntimeVersions(2));

        return new ModelTurnRequest(
            snapshot, Guid.NewGuid(), Mode,
            [new ConversationMessage(Guid.NewGuid(), ConversationMessageRole.User, userMessage, DateTimeOffset.UtcNow)],
            "Australia/Sydney", DateTimeOffset.UtcNow);
    }

    private const string ValidProposalTurn = """
    {
      "signals": { "intent": "concrete_action", "userExpressedActionIntent": true,
                   "actionIntentQuote": "明天要上班", "userRejectedAction": false },
      "strategy": "show_proposal_set",
      "response": { "type": "proposal_introduction", "text": "建议 9 点开始，精神最好。", "question": null },
      "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "上班",
        "description": null, "date": "2026-08-26", "startTime": "09:00", "endTime": "17:00",
        "labelId": null } ] }
    }
    """;

    [Fact]
    public async Task ValidProposalTurn_CompletesWithAcceptedProposals()
    {
        // Arrange
        var runtime = Runtime(new ScriptedGateway(ValidProposalTurn));

        // Act
        var result = await runtime.ExecuteAsync(Request("明天要上班"), CancellationToken.None);

        // Assert
        result.CompletionReason.Should().Be(ModelTurnCompletionReason.Completed);
        result.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.ShowProposalSet);
        result.Outcome.AcceptedProposals.Should().HaveCount(1);
        result.Outcome.AcceptedProposals![0].TimeZoneId.Should().Be("Australia/Sydney",
            because: "the conversation's time zone is stamped server-side");
        result.Outcome.FallbackUsed.Should().BeFalse();
        result.TotalTokens.Should().Be(150);
    }

    [Fact]
    public async Task InvalidJsonThenValid_UsesTheOneSchemaCorrection()
    {
        // Arrange
        var gateway = new ScriptedGateway("definitely not json", ValidProposalTurn);
        var runtime = Runtime(gateway);

        // Act
        var result = await runtime.ExecuteAsync(Request("明天要上班"), CancellationToken.None);

        // Assert
        result.CompletionReason.Should().Be(ModelTurnCompletionReason.Completed,
            because: "one schema correction attempt is allowed (v3 §21)");
        gateway.Requests.Should().HaveCount(2);
        result.TotalTokens.Should().Be(300, because: "both calls' tokens are accounted");
    }

    [Fact]
    public async Task PersistentlyInvalidOutput_FailsAsInvalidModelResponse()
    {
        // Arrange
        var runtime = Runtime(new ScriptedGateway("garbage", "still garbage"));

        // Act
        var result = await runtime.ExecuteAsync(Request("明天要上班"), CancellationToken.None);

        // Assert
        result.CompletionReason.Should().Be(ModelTurnCompletionReason.InvalidModelResponse);
        result.Outcome.Should().BeNull(because: "no partial candidate may ever surface (v3 §23)");
    }

    [Fact]
    public async Task ProposalWithFabricatedEvidence_IsDowngradedToAClarifyingFallback()
    {
        // Arrange — quote not present in the user message.
        const string fabricated = """
        {
          "signals": { "intent": "concrete_action", "userExpressedActionIntent": true,
                       "actionIntentQuote": "帮我安排上班", "userRejectedAction": false },
          "strategy": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "排好了！", "question": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "上班",
            "description": null, "date": "2026-08-26", "startTime": "09:00", "endTime": "17:00",
            "labelId": null } ] }
        }
        """;
        var runtime = Runtime(new ScriptedGateway(fabricated));

        // Act
        var result = await runtime.ExecuteAsync(Request("我今天有点累"), CancellationToken.None);

        // Assert
        result.CompletionReason.Should().Be(ModelTurnCompletionReason.Completed);
        result.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.AskClarifyingQuestion,
            because: "unverified evidence downgrades the proposal path (v3 §14.1)");
        result.Outcome.AcceptedProposals.Should().BeNull(because: "the candidate card is discarded whole");
        result.Outcome.FallbackUsed.Should().BeTrue();
        result.Outcome.AssistantMessage.Should().NotBeEmpty();
    }

    [Fact]
    public async Task RequestCarriesTheStructuredOutputFormat()
    {
        // Arrange
        var gateway = new ScriptedGateway(ValidProposalTurn);
        var runtime = Runtime(gateway);

        // Act
        await runtime.ExecuteAsync(Request("明天要上班"), CancellationToken.None);

        // Assert
        var request = gateway.Requests.Single();
        request.ResponseFormat.Should().NotBeNull(because: "v3 §10: the model returns one structured candidate");
        request.Tools.Should().BeEmpty(because: "v1 registers no read-only tools");
        request.SystemPrompt.Should().Contain("Strategies allowed this turn",
            because: "the execution frame projects the strategy envelope");
    }
}

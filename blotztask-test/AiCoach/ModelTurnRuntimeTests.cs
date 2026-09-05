using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Prompts;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Guards;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging;
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

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<string> Messages { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter) => Messages.Add(formatter(state, exception));
    }

    private static ModelTurnRuntime Runtime(
        IModelGateway gateway,
        ILogger<ModelTurnRuntime>? logger = null)
    {
        var promptRegistry = new PromptModuleRegistry();
        promptRegistry.Register(ExecutionPromptModules.Profile);

        return new ModelTurnRuntime(
            gateway,
            new ModelContextBuilder(new ModelPromptAssembler(promptRegistry)),
            new ConversationPrePolicy(),
            new ConversationPostPolicy(),
            new EvidenceGuard(),
            new PlanningReadinessCalculator(),
            new DeterministicProposalGenerator(),
            new ResponseGuard(),
            new ProposalSetGuard(),
            Options.Create(new AiCoachModuleOptions()),
            logger ?? NullLogger<ModelTurnRuntime>.Instance);
    }

    private static ModelTurnRequest Request(
        string userMessage,
        ActivePlanningIntentSnapshot? activePlanningIntent = null,
        DateTimeOffset? userLocalNow = null)
    {
        var snapshot = new ConversationSnapshot(
            Guid.NewGuid(), Guid.NewGuid(), AiCoachMode.Execution,
            ConversationPhase.Conversing, GenerationStatus.Running, BlockedReason.None, 1,
            null, null, new HashSet<ConversationFact>(), new HashSet<ConversationAction>(),
            Mode.ToRuntimeVersions(2), activePlanningIntent);

        return new ModelTurnRequest(
            snapshot, Guid.NewGuid(), Mode,
            [new ConversationMessage(Guid.NewGuid(), ConversationMessageRole.User, userMessage, DateTimeOffset.UtcNow)],
            "Australia/Sydney",
            userLocalNow ?? new DateTimeOffset(2026, 8, 25, 8, 0, 0, TimeSpan.FromHours(10)));
    }

    private const string ValidProposalTurn = """
    {
      "interpretation": { "intent": "concrete_action",
        "planningItems": [ { "text": "上班", "kind": "action", "evidence": { "quote": "明天要上班" } } ],
        "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null } },
      "suggestedAction": "show_proposal_set",
      "response": { "type": "proposal_introduction", "text": "建议 9 点开始，精神最好。", "question": null, "questionTopic": null },
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
        const string privateRawOutput = "PRIVATE_RAW_MODEL_OUTPUT_D4F8";
        var logger = new CapturingLogger<ModelTurnRuntime>();
        var runtime = Runtime(new ScriptedGateway(privateRawOutput, privateRawOutput), logger);

        // Act
        var result = await runtime.ExecuteAsync(Request("明天要上班"), CancellationToken.None);

        // Assert
        result.CompletionReason.Should().Be(ModelTurnCompletionReason.InvalidModelResponse);
        result.Outcome.Should().BeNull(because: "no partial candidate may ever surface (v3 §23)");
        var logs = string.Join("\n", logger.Messages);
        logs.Should().Contain(privateRawOutput);
        logs.Should().Contain("Output is not valid JSON for the required schema");
    }

    [Fact]
    public async Task ProposalWithFabricatedEvidence_IsDowngradedToAClarifyingFallback()
    {
        // Arrange — quote not present in the user message.
        const string fabricated = """
        {
          "interpretation": { "intent": "concrete_action",
            "planningItems": [ { "text": "上班", "kind": "action", "evidence": { "quote": "帮我安排上班" } } ],
            "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "排好了！", "question": null, "questionTopic": null },
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
    public async Task BroadGoalWithoutDelegation_CannotProduceProposal()
    {
        const string output = """
        {
          "interpretation": { "intent": "goal",
            "planningItems": [ { "text": "提高英语水平", "kind": "goal", "evidence": { "quote": "提高英语水平" } } ],
            "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "先练习 30 分钟。", "question": null, "questionTopic": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "英语练习",
            "description": null, "date": "2026-08-26", "startTime": "09:00", "endTime": "09:30",
            "labelId": null } ] }
        }
        """;
        var runtime = Runtime(new ScriptedGateway(output));

        var result = await runtime.ExecuteAsync(Request("我想提高英语水平"), CancellationToken.None);

        result.CompletionReason.Should().Be(ModelTurnCompletionReason.Completed);
        result.Outcome!.AcceptedProposals.Should().BeNull();
        result.Outcome.FinalStrategy.Should().Be(ConversationStrategy.AskClarifyingQuestion);
        result.Outcome.ReasonCode.Should().Be(StrategyReasonCode.ExplicitActionIntentRequired);
    }

    [Fact]
    public async Task BroadGoalWithExplicitDelegation_CanProduceProposal()
    {
        const string output = """
        {
          "interpretation": { "intent": "goal",
            "planningItems": [ { "text": "提高英语水平", "kind": "goal", "evidence": { "quote": "提高英语水平" } } ],
            "constraints": [], "disposition": { "kind": "delegated_to_coach", "evidence": { "quote": "你帮我安排" } } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "建议明天 9 点练习 30 分钟。", "question": null, "questionTopic": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "英语练习",
            "description": null, "date": "2026-08-26", "startTime": "09:00", "endTime": "09:30",
            "labelId": null } ] }
        }
        """;
        var runtime = Runtime(new ScriptedGateway(output));

        var result = await runtime.ExecuteAsync(
            Request("我想提高英语水平，你帮我安排"), CancellationToken.None);

        result.CompletionReason.Should().Be(ModelTurnCompletionReason.Completed);
        result.Outcome!.AcceptedProposals.Should().ContainSingle();
        result.Outcome.FinalStrategy.Should().Be(ConversationStrategy.ShowProposalSet);
    }

    [Fact]
    public async Task ModelProposalAfterWorkingHours_IsRejectedAndUsesValidDeterministicFallback()
    {
        const string afterHours = """
        {
          "interpretation": { "intent": "concrete_action",
            "planningItems": [ { "text": "整理资料", "kind": "action", "evidence": { "quote": "整理资料" } } ],
            "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "建议今晚整理。", "question": null, "questionTopic": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "整理资料",
            "description": null, "date": "2026-08-26", "startTime": "22:45", "endTime": "23:00",
            "labelId": null } ] }
        }
        """;
        var gateway = new ScriptedGateway(afterHours, afterHours);
        var runtime = Runtime(gateway);

        var result = await runtime.ExecuteAsync(Request("整理资料"), CancellationToken.None);

        gateway.Requests.Should().HaveCount(2, "the model gets one bounded chance to correct its schedule");
        result.Outcome!.FallbackUsed.Should().BeTrue();
        result.Outcome.AcceptedProposals.Should().ContainSingle();
        result.Outcome.AcceptedProposals![0].StartTime.ToTimeSpan().Should()
            .BeGreaterThanOrEqualTo(new TimeOnly(8, 0).ToTimeSpan());
        result.Outcome.AcceptedProposals[0].EndTime.ToTimeSpan().Should()
            .BeLessThanOrEqualTo(new TimeOnly(21, 0).ToTimeSpan());
    }

    [Fact]
    public async Task ProposalRepair_CannotReplaceVerifiedDelegationWithInternalInstructionEvidence()
    {
        const string invalidSchedule = """
        {
          "interpretation": { "intent": "goal", "planningItems": [], "constraints": [],
            "disposition": { "kind": "delegated_to_coach", "evidence": { "quote": "你给我建议" } } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "建议今晚开始。", "question": null, "questionTopic": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "英语听力热身",
            "description": "先听一小段英语音频。", "date": "2026-09-03", "startTime": "23:55", "endTime": "00:25",
            "labelId": null } ] }
        }
        """;
        const string repairedScheduleWithPollutedInterpretation = """
        {
          "interpretation": { "intent": "question", "planningItems": [], "constraints": [],
            "disposition": { "kind": "answered", "evidence": { "quote": "The proposal card failed server validation." } } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "改到明天早上开始。", "question": null, "questionTopic": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "英语听力热身",
            "description": "先听一小段英语音频。", "date": "2026-09-04", "startTime": "08:00", "endTime": "08:30",
            "labelId": null } ] }
        }
        """;
        var gateway = new ScriptedGateway(invalidSchedule, repairedScheduleWithPollutedInterpretation);
        var logger = new CapturingLogger<ModelTurnRuntime>();
        var runtime = Runtime(gateway, logger);
        var sourceMessageId = Guid.NewGuid();
        var activeIntent = new ActivePlanningIntentSnapshot(
            Guid.NewGuid(),
            sourceMessageId,
            [new PlanningItemSnapshot("提高英语水平", "我想提高英语水平", sourceMessageId, PlanningItemKind.Goal)],
            [],
            PlanningIntentStatus.Collecting);

        var result = await runtime.ExecuteAsync(
            Request(
                "你给我建议",
                activeIntent,
                new DateTimeOffset(2026, 9, 3, 23, 52, 0, TimeSpan.FromHours(10))),
            CancellationToken.None);

        gateway.Requests.Should().HaveCount(2,
            "the repaired payload must reuse the first verified control context instead of triggering another interpretation retry");
        result.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.ShowProposalSet);
        result.Outcome.AcceptedProposals.Should().ContainSingle();
        result.Outcome.AcceptedProposals![0].StartTime.Should().Be(new TimeOnly(8, 0));
        result.Outcome.FallbackUsed.Should().BeFalse();
        gateway.Requests[1].Messages.Should().Contain(message => message is GatewaySystemMessage,
            "internal repair instructions must have a system role");
        gateway.Requests[1].Messages.OfType<GatewayUserMessage>().Should().OnlyContain(
            message => message.Content == "你给我建议",
            "internal repair instructions must never masquerade as user input");
        var logs = string.Join("\n", logger.Messages);
        logs.Should().Contain("AiCoach.RepairContext.Locked");
        logs.Should().Contain("AuthoritySource=LockedRepairContext");
        logs.Should().Contain("IssueCodes=QuoteNotFound",
            "the repaired candidate's polluted interpretation remains observable even though it has no authority");
    }

    [Fact]
    public async Task FabricatedCurrentClaimWithActiveIntent_UsesVerifiedOnlyDeterministicProposal()
    {
        const string fabricated = """
        {
          "interpretation": { "intent": "concrete_action",
            "planningItems": [ { "text": "上班", "kind": "action", "evidence": { "quote": "帮我安排上班" } } ],
            "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "排好了！", "question": null, "questionTopic": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "上班",
            "description": null, "date": "2026-08-26", "startTime": "09:00", "endTime": "17:00",
            "labelId": null } ] }
        }
        """;
        var gateway = new ScriptedGateway(fabricated);
        var logger = new CapturingLogger<ModelTurnRuntime>();
        var runtime = Runtime(gateway, logger);
        var sourceMessageId = Guid.NewGuid();
        var activeIntent = new ActivePlanningIntentSnapshot(
            Guid.NewGuid(),
            sourceMessageId,
            [new PlanningItemSnapshot("写报告", "写报告", sourceMessageId, PlanningItemKind.Action)],
            [],
            PlanningIntentStatus.ReadyForProposal);

        var result = await runtime.ExecuteAsync(
            Request("我今天有点累", activeIntent), CancellationToken.None);

        result.CompletionReason.Should().Be(ModelTurnCompletionReason.Completed);
        gateway.Requests.Should().HaveCount(2, because: "policy permits one bounded correction attempt");
        result.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.ShowProposalSet);
        result.Outcome.ReasonCode.Should().Be(StrategyReasonCode.EvidenceInvalid);
        result.Outcome.FallbackUsed.Should().BeTrue();
        result.Outcome.AcceptedProposals.Should().ContainSingle();
        result.Outcome.AcceptedProposals![0].Title.Should().Be("写报告",
            because: "the deterministic fallback only consumes previously verified planning material");
        result.Outcome.AcceptedProposals.Should().NotContain(proposal => proposal.Title == "上班");
        var logs = string.Join("\n", logger.Messages);
        logs.Should().Contain("AiCoach.DeterministicProposal.Completed");
        logs.Should().Contain("Source=DeterministicFallback");
        logs.Should().Contain("帮我安排上班");
        logs.Should().NotContain("AiCoach.RepairContext.Locked",
            "a candidate with invalid evidence must never become the authority for later repair attempts");
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
        request.SystemPrompt.Should().Contain("default duration 30 minutes");
        request.SystemPrompt.Should().Contain("working hours 08:00-21:00");
    }

    [Fact]
    public async Task RuntimeLogsGovernanceBoundariesWithFullDiagnosticPayloads()
    {
        const string privateUserText =
            "PRIVATE_USER_TEXT_7E21 evidence PRIVATE_ITEM_8A42 constraint evidence PRIVATE_CONSTRAINT_5B17";
        const string privateAssistantText = "PRIVATE_ASSISTANT_TEXT_1C93";
        const string privateProposalTitle = "PRIVATE_ITEM_8A42";
        const string privateProposalDescription = "PRIVATE_DESCRIPTION_2D64";
        const string privateConstraint = "PRIVATE_CONSTRAINT_5B17";
        const string privateItemEvidence = "evidence PRIVATE_ITEM_8A42";
        const string privateConstraintEvidence = "constraint evidence PRIVATE_CONSTRAINT_5B17";
        var output = $$"""
        {
          "interpretation": { "intent": "concrete_action",
            "planningItems": [ { "text": "{{privateProposalTitle}}", "kind": "action", "evidence": { "quote": "{{privateItemEvidence}}" } } ],
            "constraints": [ { "text": "{{privateConstraint}}", "evidence": { "quote": "{{privateConstraintEvidence}}" } } ],
            "disposition": { "kind": "not_applicable", "evidence": null } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "{{privateAssistantText}}", "question": null, "questionTopic": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "{{privateProposalTitle}}",
            "description": "{{privateProposalDescription}}", "date": "2027-08-26", "startTime": "09:00", "endTime": "10:00",
            "labelId": null } ] }
        }
        """;
        var logger = new CapturingLogger<ModelTurnRuntime>();
        var runtime = Runtime(new ScriptedGateway(output), logger);

        var result = await runtime.ExecuteAsync(Request(privateUserText), CancellationToken.None);

        result.CompletionReason.Should().Be(ModelTurnCompletionReason.Completed);
        var logs = string.Join("\n", logger.Messages);
        logs.Should().Contain("AiCoach.ModelTurn.Started");
        logs.Should().Contain("AiCoach.ModelCall.Completed");
        logs.Should().Contain("AiCoach.SchemaValidation.Completed");
        logs.Should().Contain("AiCoach.EvidenceValidation.Completed");
        logs.Should().Contain("AiCoach.PlanningReadiness.Completed");
        logs.Should().Contain("ExistingActiveItemCount=0");
        logs.Should().Contain("ResultingPlanningItemCount=1");
        logs.Should().Contain("AiCoach.PostPolicy.Completed");
        logs.Should().Contain("AiCoach.ResponseGuard.Completed");
        logs.Should().Contain("AiCoach.ProposalGuard.Completed");
        logs.Should().Contain("AiCoach.ModelTurn.Completed");
        logs.Should().Contain(privateUserText);
        logs.Should().Contain(output, because: "the raw model output is required during this test stage");
        logs.Should().Contain(privateAssistantText);
        logs.Should().Contain(privateProposalTitle);
        logs.Should().Contain(privateProposalDescription);
        logs.Should().Contain(privateConstraint);
        logs.Should().Contain(privateItemEvidence);
        logs.Should().Contain(privateConstraintEvidence);
        logs.Should().Contain("GuardDetail=");
    }

    [Fact]
    public async Task RuntimeLogsResponseGuardFreeTextDetail()
    {
        var oversizedResponse = new string('R', Mode.Policy.MaxResponseLength + 1);
        var output = $$"""
        {
          "interpretation": { "intent": "concrete_action",
            "planningItems": [ { "text": "write report", "kind": "action", "evidence": { "quote": "write report" } } ],
            "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "{{oversizedResponse}}", "question": null, "questionTopic": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "write report",
            "description": "draft", "date": "2027-08-26", "startTime": "09:00", "endTime": "10:00",
            "labelId": null } ] }
        }
        """;
        var logger = new CapturingLogger<ModelTurnRuntime>();
        var runtime = Runtime(new ScriptedGateway(output), logger);

        await runtime.ExecuteAsync(Request("write report"), CancellationToken.None);

        string.Join("\n", logger.Messages)
            .Should().Contain($"Assistant text exceeds {Mode.Policy.MaxResponseLength} characters.");
    }

    [Fact]
    public async Task RuntimeLogsProposalGuardFreeTextDetail()
    {
        const string output = """
        {
          "interpretation": { "intent": "concrete_action",
            "planningItems": [ { "text": "write report", "kind": "action", "evidence": { "quote": "write report" } } ],
            "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "Scheduled.", "question": null, "questionTopic": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "write report",
            "description": "draft", "date": "2027-08-26", "startTime": "10:00", "endTime": "09:00",
            "labelId": null } ] }
        }
        """;
        var logger = new CapturingLogger<ModelTurnRuntime>();
        var runtime = Runtime(new ScriptedGateway(output, output), logger);

        await runtime.ExecuteAsync(Request("write report"), CancellationToken.None);

        string.Join("\n", logger.Messages)
            .Should().Contain("endTime must be after startTime on the same day.");
    }
}

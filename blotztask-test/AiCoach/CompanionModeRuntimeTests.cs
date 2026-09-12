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
using BlotzTask.Modules.AiCoach.Domain.Support;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public class CompanionModeRuntimeTests
{
    private static readonly AiCoachModeDefinition Mode = CompanionModeDefinition.Create();

    private sealed class ScriptedGateway(string output) : IModelGateway
    {
        public Task<ModelCompletionResult> CompleteAsync(
            ModelGatewayRequest request,
            CancellationToken cancellationToken) => Task.FromResult(new ModelCompletionResult(
            output, [], ModelFinishReason.Stop, 100, 50, 150));
    }

    [Fact]
    public async Task Handle_EmotionalExpression_ReturnsListeningWithoutProposal()
    {
        // Arrange
        const string output = """
        {
          "interpretation": {
            "intent": "emotional", "planningItems": [], "constraints": [],
            "disposition": { "kind": "not_applicable", "evidence": null },
            "actionRequest": { "kind": "none", "evidence": null },
            "supportRequest": { "kind": "unspecified", "evidence": null }
          },
          "suggestedAction": "continue_listening",
          "response": { "type": "listening", "text": "这一天听起来确实很消耗。", "question": null,
            "questionTopic": null, "supportMove": "reflect" },
          "proposalSet": null
        }
        """;

        // Act
        var result = await Runtime(output).ExecuteAsync(Request("我今天真的很累"), CancellationToken.None);

        // Assert
        result.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.ContinueListening,
            because: "emotional expression is a successful Companion listening turn");
        result.Outcome.AcceptedProposals.Should().BeNull(
            because: "emotion is never action authorization");
    }

    [Fact]
    public async Task Handle_EmotionalExpressionMisclassifiedAsListening_DoesNotPersistPreference()
    {
        // Arrange
        const string output = """
        {
          "interpretation": {
            "intent": "emotional", "planningItems": [], "constraints": [],
            "disposition": { "kind": "not_applicable", "evidence": null },
            "actionRequest": { "kind": "none", "evidence": null },
            "supportRequest": { "kind": "wants_listening", "evidence": { "quote": "我又拖延了一整天。" } }
          },
          "suggestedAction": "continue_listening",
          "response": { "type": "listening", "text": "听起来你今天又被拖延卡住了。", "question": null,
            "questionTopic": null, "supportMove": "acknowledge" },
          "proposalSet": null
        }
        """;

        // Act
        var result = await Runtime(output).ExecuteAsync(
            Request("我又拖延了一整天。"), CancellationToken.None);

        // Assert
        result.Outcome!.SupportPreferenceUpdate.Should().BeNull(
            because: "an emotional statement is not an explicit request for the assistant to only listen");
    }

    [Fact]
    public async Task Handle_FirstGentleQuestion_IsControlledBySupportPolicyNotPlanning()
    {
        // Arrange
        const string output = """
        {
          "interpretation": {
            "intent": "emotional", "planningItems": [], "constraints": [],
            "disposition": { "kind": "not_applicable", "evidence": null },
            "actionRequest": { "kind": "none", "evidence": null },
            "supportRequest": { "kind": "unspecified", "evidence": null }
          },
          "suggestedAction": "ask_gentle_question",
          "response": { "type": "gentle_question", "text": "这件事最消耗你的部分是什么？",
            "question": "这件事最消耗你的部分是什么？", "questionTopic": "other", "supportMove": "gentle_question" },
          "proposalSet": null
        }
        """;

        // Act
        var result = await Runtime(output).ExecuteAsync(Request("我今天真的很累"), CancellationToken.None);

        // Assert
        result.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.AskGentleQuestion,
            because: "a first support question is governed by Support Policy, not planning readiness");
        result.Outcome.PlanningIntentUpdate.Should().BeNull(
            because: "a gentle support question must not create planning state");
    }

    [Fact]
    public async Task Handle_ActionMention_DoesNotCreateProposal()
    {
        // Arrange
        const string output = """
        {
          "interpretation": {
            "intent": "concrete_action",
            "planningItems": [{ "text": "跑步", "kind": "action", "evidence": { "quote": "明天可能得跑步" } }],
            "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null },
            "actionRequest": { "kind": "action_mention", "evidence": { "quote": "明天可能得跑步" } },
            "supportRequest": { "kind": "unspecified", "evidence": null }
          },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "我先做了一张卡。", "question": null,
            "questionTopic": null, "supportMove": "reflect" },
          "proposalSet": { "proposals": [{ "clientProposalKey": "p1", "title": "跑步", "description": null,
            "date": "2026-09-08", "startTime": "08:00", "endTime": "08:30", "labelId": null }] }
        }
        """;

        // Act
        var result = await Runtime(output).ExecuteAsync(
            Request("明天可能得跑步，但现在不想动"), CancellationToken.None);

        // Assert
        result.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.ContinueListening,
            because: "an action mention does not satisfy Companion's direct-instruction trigger");
        result.Outcome.AcceptedProposals.Should().BeNull(
            because: "Post-Policy must discard the unauthorized card as a whole");
        result.Outcome.PlanningIntentUpdate.Should().BeNull(
            because: "Companion does not retain ordinary action mentions when historical references are unavailable");
    }

    [Fact]
    public async Task Handle_CurrentTurnDirectInstruction_CreatesPendingProposalCandidate()
    {
        // Arrange
        const string output = """
        {
          "interpretation": {
            "intent": "concrete_action",
            "planningItems": [{ "text": "跑步", "kind": "action", "evidence": { "quote": "帮我安排明天早上跑步" } }],
            "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null },
            "actionRequest": { "kind": "direct_instruction", "evidence": { "quote": "帮我安排明天早上跑步" } },
            "supportRequest": { "kind": "unspecified", "evidence": null }
          },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "我建议明早八点跑半小时，你可以在卡片里调整。",
            "question": null, "questionTopic": null, "supportMove": "acknowledge" },
          "proposalSet": { "proposals": [{ "clientProposalKey": "p1", "title": "跑步", "description": null,
            "date": "2026-09-08", "startTime": "08:00", "endTime": "08:30", "labelId": null }] }
        }
        """;

        // Act
        var result = await Runtime(output).ExecuteAsync(
            Request("帮我安排明天早上跑步"), CancellationToken.None);

        // Assert
        result.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.ShowProposalSet,
            because: "a verified current-turn direct instruction may enter the shared proposal pipeline");
        result.Outcome.AcceptedProposals.Should().ContainSingle(
            because: "the result is still only a server-validated pending proposal");
    }

    [Fact]
    public async Task Handle_ListeningRequest_DowngradesQuestionAndPersistsPreference()
    {
        // Arrange
        const string output = """
        {
          "interpretation": {
            "intent": "emotional", "planningItems": [], "constraints": [],
            "disposition": { "kind": "not_applicable", "evidence": null },
            "actionRequest": { "kind": "none", "evidence": null },
            "supportRequest": { "kind": "wants_listening", "evidence": { "quote": "你听我说就好" } }
          },
          "suggestedAction": "ask_gentle_question",
          "response": { "type": "gentle_question", "text": "发生了什么？", "question": "发生了什么？",
            "questionTopic": "other", "supportMove": "gentle_question" },
          "proposalSet": null
        }
        """;

        // Act
        var result = await Runtime(output).ExecuteAsync(
            Request("你听我说就好，今天很糟"), CancellationToken.None);

        // Assert
        result.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.ContinueListening,
            because: "an explicit listening request outranks the model's question");
        result.Outcome.SupportPreferenceUpdate!.Kind.Should().Be(SupportRequestKind.WantsListening,
            because: "the verified preference is committed for later turns in this conversation");
    }

    private static ModelTurnRuntime Runtime(string output)
    {
        var prompts = new PromptModuleRegistry();
        prompts.Register(CompanionPromptModules.Profile);
        return new ModelTurnRuntime(
            new ScriptedGateway(output),
            new ModelContextBuilder(new ModelPromptAssembler(prompts)),
            new ConversationPrePolicy(),
            new ConversationPostPolicy(),
            new EvidenceGuard(),
            new PlanningReadinessCalculator(),
            new SupportPolicyCalculator(),
            new DeterministicProposalGenerator(),
            new ResponseGuard(),
            new ProposalSetGuard(),
            Options.Create(new AiCoachModuleOptions()),
            NullLogger<ModelTurnRuntime>.Instance);
    }

    private static ModelTurnRequest Request(string userMessage)
    {
        var snapshot = new ConversationSnapshot(
            Guid.NewGuid(), Guid.NewGuid(), AiCoachMode.Companion,
            ConversationPhase.Conversing, GenerationStatus.Running, BlockedReason.None, 1,
            null, null, new HashSet<ConversationFact>(), new HashSet<ConversationAction>(),
            Mode.ToRuntimeVersions(3));
        return new ModelTurnRequest(
            snapshot,
            Guid.NewGuid(),
            Mode,
            [new ConversationMessage(Guid.NewGuid(), ConversationMessageRole.User, userMessage, DateTimeOffset.UtcNow)],
            "Australia/Perth",
            new DateTimeOffset(2026, 9, 7, 10, 0, 0, TimeSpan.FromHours(8)));
    }
}

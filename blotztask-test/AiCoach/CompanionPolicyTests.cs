using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Guards;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Kernel;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Support;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public class CompanionPolicyTests
{
    private static readonly AiCoachModeDefinition Mode = CompanionModeDefinition.Create();

    [Fact]
    public void Handle_UnspecifiedRequestAfterQuestion_DisallowsAnotherQuestion()
    {
        // Arrange
        var calculator = new SupportPolicyCalculator();

        // Act
        var decision = calculator.Calculate(new SupportPolicyContext(
            Snapshot(),
            new VerifiedSupportRequest(SupportRequestKind.Unspecified, null),
            ConversationStrategy.AskGentleQuestion,
            Guid.NewGuid(),
            Mode.SupportPolicy!));

        // Assert
        decision.Allows(SupportMove.GentleQuestion).Should().BeFalse(
            because: "Companion does not ask in consecutive turns by default");
        decision.Reasons.Should().Contain(SupportDecisionReason.QuestionCadenceExhausted,
            because: "the downgrade must remain observable as a stable policy reason");
    }

    [Fact]
    public void Handle_StoredExplorationPreferenceAfterQuestion_AllowsContinuedExploration()
    {
        // Arrange
        var sourceMessageId = Guid.NewGuid();
        var snapshot = Snapshot() with
        {
            CompanionContext = new CompanionContextSnapshot(new SupportPreferenceSnapshot(
                SupportRequestKind.WantsExploration,
                sourceMessageId,
                "继续问我",
                1)),
        };

        // Act
        var decision = new SupportPolicyCalculator().Calculate(new SupportPolicyContext(
            snapshot,
            new VerifiedSupportRequest(SupportRequestKind.Unspecified, null),
            ConversationStrategy.AskGentleQuestion,
            Guid.NewGuid(),
            Mode.SupportPolicy!));

        // Assert
        decision.Allows(SupportMove.GentleQuestion).Should().BeTrue(
            because: "the user explicitly requested continuous exploration");
    }

    [Fact]
    public void Handle_ExplicitListeningPreference_DisallowsAdviceAndQuestions()
    {
        // Arrange
        var currentMessageId = Guid.NewGuid();
        var request = new VerifiedSupportRequest(SupportRequestKind.WantsListening, "你听我说就好");

        // Act
        var decision = new SupportPolicyCalculator().Calculate(new SupportPolicyContext(
            Snapshot(), request, null, currentMessageId, Mode.SupportPolicy!));

        // Assert
        decision.Allows(SupportMove.Reflect).Should().BeTrue(
            because: "reflection is compatible with a listening request");
        decision.Allows(SupportMove.OfferAdvice).Should().BeFalse(
            because: "explicit listening takes priority over unsolicited advice");
        decision.Allows(SupportMove.GentleQuestion).Should().BeFalse(
            because: "the user asked only to be heard");
        decision.PreferenceUpdate.Should().NotBeNull(
            because: "the verified preference must survive later turns in this in-memory conversation");
    }

    [Theory]
    [InlineData(ActionRequestKind.ActionMention, PlanningReadiness.ReadyForSuggestion, false)]
    [InlineData(ActionRequestKind.AdviceRequest, PlanningReadiness.ReadyForSuggestion, false)]
    [InlineData(ActionRequestKind.ReferencedInstruction, PlanningReadiness.ReadyForSuggestion, false)]
    [InlineData(ActionRequestKind.DirectInstruction, PlanningReadiness.ReadyForProposal, true)]
    public void Handle_CompanionActionRequest_AppliesCurrentTurnDirectInstructionTrigger(
        ActionRequestKind requestKind,
        PlanningReadiness expectedReadiness,
        bool proposalAllowed)
    {
        // Arrange
        var verified = new VerifiedPlanningContext(
            [new VerifiedPlanningItem("明早跑步", PlanningItemKind.Action, "明早跑步")],
            [],
            UserTurnDisposition.NotApplicable,
            new EvidenceSummary(2, 2, []),
            new VerifiedActionRequest(requestKind, "明早跑步"));

        // Act
        var decision = new PlanningReadinessCalculator().Calculate(new PlanningReadinessContext(
            Snapshot(), verified, Mode.Policy.Planning));

        // Assert
        decision.Readiness.Should().Be(expectedReadiness,
            because: "Companion planning follows the current-turn direct-instruction trigger");
        decision.Allows(AllowedPlanningAction.GenerateProposal).Should().Be(proposalAllowed,
            because: "mentioning an action or asking advice is not task authorization");
    }

    [Fact]
    public void Handle_FabricatedSupportEvidence_DoesNotChangeSupportPreference()
    {
        // Arrange
        var interpretation = new InterpretationCandidate(
            IntentType.Emotional,
            ActionRequest: new ActionRequestCandidate(ActionRequestKind.None, null),
            SupportRequest: new SupportRequestCandidate(
                SupportRequestKind.WantsExploration,
                new EvidenceReference("继续问我")));

        // Act
        var verified = new EvidenceGuard().Verify(interpretation, "我今天真的很累");

        // Assert
        verified.SupportRequest.Should().BeNull(
            because: "a support preference is authoritative only after its current-message quote is verified");
        verified.Evidence.Issues.Should().Contain(EvidenceIssue.QuoteNotFound,
            because: "fabricated preference evidence must fail closed");
    }

    [Fact]
    public void Handle_VerifiedSupportPreference_ProducesKernelMutation()
    {
        // Arrange
        var preference = new SupportPreferenceSnapshot(
            SupportRequestKind.WantsExploration, Guid.NewGuid(), "继续问我", 1);
        var outcome = new ValidatedTurnOutcome(
            ConversationStrategy.AskGentleQuestion,
            StrategyDecisionType.Accepted,
            StrategyReasonCode.None,
            "哪一部分最值得先聊？",
            "哪一部分最值得先聊？",
            null,
            false,
            SupportPreferenceUpdate: preference);

        // Act
        var transition = new ConversationKernel().Apply(
            Snapshot(),
            new ModelTurnCompleted(Guid.NewGuid(), 1, outcome),
            Mode);

        // Assert
        transition.Mutations.Should().ContainEquivalentOf(new SetSupportPreferenceMutation(preference),
            because: "only the Kernel-approved transition may commit the verified preference");
        transition.NextPhase.Should().Be(ConversationPhase.Conversing,
            because: "a gentle support question is not a planning clarification");
    }

    [Fact]
    public async Task Handle_StartCompanionConversation_CreatesPinnedInMemoryConversation()
    {
        // Arrange
        var registry = new ModeDefinitionRegistry();
        registry.Register(ExecutionModeDefinition.Create());
        registry.Register(CompanionModeDefinition.Create());
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var store = new InMemoryConversationStore(cache);
        var handler = new StartConversationCommandHandler(
            store,
            registry,
            Options.Create(new AiCoachModuleOptions()),
            TimeProvider.System);

        // Act
        var result = await handler.Handle(new StartConversationCommand
        {
            UserId = Guid.NewGuid(),
            TimeZoneId = "Australia/Perth",
            Mode = AiCoachMode.Companion,
        });
        var stored = await store.FindAsync(result.ConversationId, CancellationToken.None);

        // Assert
        result.Mode.Should().Be("companion",
            because: "the creation API must expose the selected registered mode");
        stored!.Mode.Should().Be(AiCoachMode.Companion,
            because: "mode is pinned on the authoritative in-memory conversation");
        stored.RuntimeVersions.ModelContractSchemaVersion.Should().Be(3,
            because: "Companion is pinned to the schema that carries Action and Support requests");
        stored.RuntimeVersions.SupportPolicyVersion.Should().Be("companion-support-v1",
            because: "the active conversation must not silently switch support policy");
    }

    private static ConversationSnapshot Snapshot() => new(
        Guid.NewGuid(),
        Guid.NewGuid(),
        AiCoachMode.Companion,
        ConversationPhase.Conversing,
        GenerationStatus.Running,
        BlockedReason.None,
        1,
        null,
        null,
        new HashSet<ConversationFact>(),
        new HashSet<ConversationAction>(),
        Mode.ToRuntimeVersions(3));
}

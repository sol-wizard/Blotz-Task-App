using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public class PlanningReadinessTests
{
    private readonly PlanningReadinessCalculator _calculator = new();

    [Fact]
    public void VerifiedAction_IsReadyForProposal()
    {
        var decision = Calculate(
            ExecutionModeDefinition.Create(),
            [new VerifiedPlanningItem("写摘要", PlanningItemKind.Action, "写摘要")]);

        decision.Readiness.Should().Be(PlanningReadiness.ReadyForProposal);
        decision.Allows(AllowedPlanningAction.GenerateProposal).Should().BeTrue();
    }

    [Fact]
    public void GoalWithoutDelegation_CannotGenerateProposal()
    {
        var decision = Calculate(
            ExecutionModeDefinition.Create(),
            [new VerifiedPlanningItem("改善生活", PlanningItemKind.Goal, "改善生活")]);

        decision.Readiness.Should().Be(PlanningReadiness.ReadyForSuggestion);
        decision.Allows(AllowedPlanningAction.GenerateProposal).Should().BeFalse();
        decision.Allows(AllowedPlanningAction.AskClarification).Should().BeTrue();
    }

    [Fact]
    public void GoalWithExplicitDelegation_IsReadyForProposal()
    {
        var decision = Calculate(
            ExecutionModeDefinition.Create(),
            [new VerifiedPlanningItem("改善生活", PlanningItemKind.Goal, "改善生活")],
            UserTurnDisposition.DelegatedToCoach);

        decision.Readiness.Should().Be(PlanningReadiness.ReadyForProposal);
        decision.Allows(AllowedPlanningAction.GenerateProposal).Should().BeTrue();
        decision.Reasons.Should().Contain(PlanningDecisionReason.UserDelegatedPlanning);
    }

    [Fact]
    public void CannotProvide_DoesNotAutomaticallyBecomeReadyWithoutPolicyPermission()
    {
        var decision = Calculate(
            CompanionModeDefinition.Create(),
            [new VerifiedPlanningItem("改善生活", PlanningItemKind.Goal, "改善生活")],
            UserTurnDisposition.CannotProvide);

        decision.Readiness.Should().NotBe(PlanningReadiness.ReadyForProposal);
        decision.Allows(AllowedPlanningAction.GenerateProposal).Should().BeFalse();
    }

    [Fact]
    public void RejectedAction_IsBlockedEvenWhenAnActionWasVerified()
    {
        var decision = Calculate(
            ExecutionModeDefinition.Create(),
            [new VerifiedPlanningItem("写摘要", PlanningItemKind.Action, "写摘要")],
            UserTurnDisposition.RejectedAction);

        decision.Readiness.Should().Be(PlanningReadiness.Blocked);
        decision.Allows(AllowedPlanningAction.GenerateProposal).Should().BeFalse();
    }

    [Fact]
    public void PlanningState_UsesReadinessInsteadOfClarificationPresence()
    {
        var notReady = new PlanningDecision(
            PlanningReadiness.ReadyForSuggestion,
            new HashSet<AllowedPlanningAction> { AllowedPlanningAction.OfferSuggestion },
            [PlanningDecisionReason.ClarificationCanHelp],
            []);
        var ready = new PlanningDecision(
            PlanningReadiness.ReadyForProposal,
            new HashSet<AllowedPlanningAction> { AllowedPlanningAction.GenerateProposal },
            [PlanningDecisionReason.VerifiedActionAvailable],
            []);

        PlanningStateRules.NextIntentStatus(
                PlanningIntentStatus.Collecting, notReady, proposalAccepted: false)
            .Should().Be(PlanningIntentStatus.Collecting);
        PlanningStateRules.NextIntentStatus(
                PlanningIntentStatus.Collecting, ready, proposalAccepted: false)
            .Should().Be(PlanningIntentStatus.ReadyForProposal);
    }

    [Fact]
    public void CompletedPlanningIntent_DoesNotReopenFromHistoricalItems()
    {
        var mode = ExecutionModeDefinition.Create();
        var sourceMessageId = Guid.NewGuid();
        var snapshot = Snapshot(mode) with
        {
            ActivePlanningIntent = new ActivePlanningIntentSnapshot(
                Guid.NewGuid(),
                sourceMessageId,
                [new PlanningItemSnapshot("旧任务", "旧任务", sourceMessageId, PlanningItemKind.Action)],
                [],
                PlanningIntentStatus.Completed),
        };
        var verified = new VerifiedPlanningContext(
            [], [], UserTurnDisposition.NotApplicable, new EvidenceSummary(0, 0, []));

        var decision = _calculator.Calculate(new PlanningReadinessContext(
            snapshot, verified, mode.Policy.Planning));

        decision.Readiness.Should().Be(PlanningReadiness.ReadyForClarification);
        decision.Allows(AllowedPlanningAction.GenerateProposal).Should().BeFalse();
    }

    [Fact]
    public void ExhaustedClarificationBudget_DoesNotAllowAnotherQuestion()
    {
        var mode = CompanionModeDefinition.Create();
        var sourceMessageId = Guid.NewGuid();
        var snapshot = Snapshot(mode) with
        {
            ActivePlanningIntent = new ActivePlanningIntentSnapshot(
                Guid.NewGuid(),
                sourceMessageId,
                [new PlanningItemSnapshot("改善生活", "改善生活", sourceMessageId, PlanningItemKind.Goal)],
                [],
                PlanningIntentStatus.Collecting,
                new HashSet<ClarificationTopic> { ClarificationTopic.ConcreteStep }),
        };
        var verified = new VerifiedPlanningContext(
            [], [], UserTurnDisposition.NotApplicable, new EvidenceSummary(0, 0, []));

        var decision = _calculator.Calculate(new PlanningReadinessContext(
            snapshot, verified, mode.Policy.Planning));

        decision.Readiness.Should().Be(PlanningReadiness.ReadyForSuggestion);
        decision.Allows(AllowedPlanningAction.AskClarification).Should().BeFalse();
    }

    private PlanningDecision Calculate(
        AiCoachModeDefinition mode,
        IReadOnlyList<VerifiedPlanningItem> items,
        UserTurnDisposition disposition = UserTurnDisposition.NotApplicable)
    {
        var snapshot = new ConversationSnapshot(
            Guid.NewGuid(), Guid.NewGuid(), mode.Mode, ConversationPhase.Conversing,
            GenerationStatus.Running, BlockedReason.None, 1,
            null, null, new HashSet<ConversationFact>(), new HashSet<ConversationAction>(),
            mode.ToRuntimeVersions(2));
        var verified = new VerifiedPlanningContext(
            items, [], disposition, new EvidenceSummary(items.Count, items.Count, []));

        return _calculator.Calculate(new PlanningReadinessContext(
            snapshot, verified, mode.Policy.Planning));
    }

    private static ConversationSnapshot Snapshot(AiCoachModeDefinition mode) => new(
        Guid.NewGuid(), Guid.NewGuid(), mode.Mode, ConversationPhase.Conversing,
        GenerationStatus.Running, BlockedReason.None, 1,
        null, null, new HashSet<ConversationFact>(), new HashSet<ConversationAction>(),
        mode.ToRuntimeVersions(2));
}

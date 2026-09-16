using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public class PlanningAuthorityTests
{
    private readonly PlanningAuthorityCalculator _calculator = new();

    [Fact]
    public void VerifiedAction_GrantsProposalAuthority()
    {
        var decision = Calculate(
            ExecutionModeDefinition.Create(),
            [new VerifiedPlanningItem("写摘要", PlanningItemKind.Action, "写摘要")]);

        decision.CanGenerateProposal.Should().BeTrue(
            because: "a verified action satisfies Execution mode's proposal trigger");
    }

    [Fact]
    public void GoalWithoutDelegation_UsesModePolicy()
    {
        var execution = Calculate(
            ExecutionModeDefinition.Create(),
            [new VerifiedPlanningItem("改善生活", PlanningItemKind.Goal, "改善生活")]);
        var companion = Calculate(
            CompanionModeDefinition.Create(),
            [new VerifiedPlanningItem("改善生活", PlanningItemKind.Goal, "改善生活")]);

        execution.CanGenerateProposal.Should().BeTrue(
            because: "Execution permits a conservative proposal for a verified goal");
        companion.CanGenerateProposal.Should().BeFalse(
            because: "Companion requires explicit planning authorization");
    }

    [Fact]
    public void CannotProvide_DoesNotAutomaticallyBecomeReadyWithoutPolicyPermission()
    {
        var decision = Calculate(
            CompanionModeDefinition.Create(),
            [new VerifiedPlanningItem("改善生活", PlanningItemKind.Goal, "改善生活")],
            UserTurnDisposition.CannotProvide);

        decision.CanGenerateProposal.Should().BeFalse(
            because: "Companion does not grant safe-default authority");
    }

    [Fact]
    public void RejectedAction_IsBlockedEvenWhenAnActionWasVerified()
    {
        var decision = Calculate(
            ExecutionModeDefinition.Create(),
            [new VerifiedPlanningItem("写摘要", PlanningItemKind.Action, "写摘要")],
            UserTurnDisposition.RejectedAction);

        decision.IsBlocked.Should().BeTrue(
            because: "a verified withdrawal is terminal for planning in this turn");
        decision.CanGenerateProposal.Should().BeFalse();
    }

    [Fact]
    public void InvalidEvidence_DoesNotGrantPlanningAuthority()
    {
        // Arrange
        var mode = ExecutionModeDefinition.Create();
        var verified = new VerifiedPlanningContext(
            [new VerifiedPlanningItem("写摘要", PlanningItemKind.Action, "写摘要")],
            [],
            UserTurnDisposition.NotApplicable,
            new EvidenceSummary(1, 1, [EvidenceIssue.QuoteNotFound]));

        // Act
        var authority = _calculator.Calculate(new PlanningAuthorityContext(
            Snapshot(mode), verified, mode.Policy.Planning));

        // Assert
        authority.CanGenerateProposal.Should().BeFalse(
            because: "invalid current-turn evidence cannot authorize a stateful draft");
        authority.CanAskClarifyingQuestion.Should().BeFalse(
            because: "a repair must not use an invalid interpretation to advance planning");
        authority.Reasons.Should().Contain(PlanningAuthorityReason.EvidenceInvalid);
    }

    [Fact]
    public void PlanningState_UsesAuthorityInsteadOfConversationFlowStage()
    {
        var noAuthority = new PlanningAuthority(
            IsBlocked: false,
            CanGenerateProposal: false,
            CanAskClarifyingQuestion: false,
            [PlanningAuthorityReason.ClarificationCanHelp],
            []);
        var proposalAuthority = new PlanningAuthority(
            IsBlocked: false,
            CanGenerateProposal: true,
            CanAskClarifyingQuestion: false,
            [PlanningAuthorityReason.VerifiedActionAvailable],
            []);

        PlanningStateRules.NextIntentStatus(
                PlanningIntentStatus.Collecting, noAuthority, proposalAccepted: false)
            .Should().Be(PlanningIntentStatus.Collecting);
        PlanningStateRules.NextIntentStatus(
                PlanningIntentStatus.Collecting, proposalAuthority, proposalAccepted: false)
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

        var authority = _calculator.Calculate(new PlanningAuthorityContext(
            snapshot, verified, mode.Policy.Planning));

        authority.CanGenerateProposal.Should().BeFalse(
            because: "completed planning material is not reusable without a fresh request");
    }

    [Fact]
    public void RepeatedClarificationTopic_DoesNotBlockAnotherQuestion()
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

        var authority = _calculator.Calculate(new PlanningAuthorityContext(
            snapshot, verified, mode.Policy.Planning));

        authority.CanAskClarifyingQuestion.Should().BeTrue(
            because: "a prior question does not make a still-needed clarification slot unavailable");
    }

    private PlanningAuthority Calculate(
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

        return _calculator.Calculate(new PlanningAuthorityContext(
            snapshot, verified, mode.Policy.Planning));
    }

    private static ConversationSnapshot Snapshot(AiCoachModeDefinition mode) => new(
        Guid.NewGuid(), Guid.NewGuid(), mode.Mode, ConversationPhase.Conversing,
        GenerationStatus.Running, BlockedReason.None, 1,
        null, null, new HashSet<ConversationFact>(), new HashSet<ConversationAction>(),
        mode.ToRuntimeVersions(2));
}

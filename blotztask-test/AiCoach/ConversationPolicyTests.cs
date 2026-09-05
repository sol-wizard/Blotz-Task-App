using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public class ConversationPolicyTests
{
    private readonly ConversationPrePolicy _prePolicy = new();
    private readonly ConversationPostPolicy _postPolicy = new();
    private readonly PlanningReadinessCalculator _readiness = new();

    private static ConversationSnapshot Snapshot(
        AiCoachModeDefinition mode,
        ProposalSetSnapshot? set = null,
        OpenQuestionSnapshot? openQuestion = null,
        ActivePlanningIntentSnapshot? activePlanningIntent = null) => new(
        Guid.NewGuid(), Guid.NewGuid(), mode.Mode,
        set is null ? ConversationPhase.Conversing : ConversationPhase.ActionPending,
        GenerationStatus.Running, BlockedReason.None, 3,
        set, openQuestion, new HashSet<ConversationFact>(),
        new HashSet<ConversationAction>(), mode.ToRuntimeVersions(2), activePlanningIntent);

    private static ActivePlanningIntentSnapshot ActiveIntent() => new(
        Guid.NewGuid(),
        Guid.NewGuid(),
        [new PlanningItemSnapshot(
            "写报告", "写报告", Guid.NewGuid(), PlanningItemKind.Action)],
        [],
        PlanningIntentStatus.ReadyForProposal);

    private static ActivePlanningIntentSnapshot GoalIntent() => new(
        Guid.NewGuid(),
        Guid.NewGuid(),
        [new PlanningItemSnapshot(
            "改善工作安排", "改善工作安排", Guid.NewGuid(), PlanningItemKind.Goal)],
        [],
        PlanningIntentStatus.Collecting,
        new HashSet<ClarificationTopic> { ClarificationTopic.ConcreteStep });

    private static ProposalSetSnapshot PendingSet() => new(
        Guid.NewGuid(), ProposalSet.SchemaVersion, ProposalSetStatus.Pending, 1,
        [new TaskProposal(Guid.NewGuid(), "整理资料", null,
            new DateOnly(2026, 8, 26), new TimeOnly(9, 0), new TimeOnly(9, 30),
            "Australia/Sydney", null)]);

    private static ProposalSetCandidate Proposals(int count = 1) => new(
        Enumerable.Range(1, count).Select(index => new TaskProposalCandidate(
            $"p{index}", $"任务{index}", null,
            new DateOnly(2026, 8, 26), new TimeOnly(9 + index, 0),
            new TimeOnly(9 + index, 30), null)).ToList());

    private static VerifiedPlanningContext Verified(
        PlanningItemKind? kind = null,
        UserTurnDisposition disposition = UserTurnDisposition.NotApplicable,
        bool invalidEvidence = false) => new(
        kind is null ? [] : [new VerifiedPlanningItem("整理资料", kind.Value, "整理资料")],
        [],
        disposition,
        new EvidenceSummary(kind is null ? 0 : 1, kind is null ? 0 : 1,
            invalidEvidence ? [EvidenceIssue.QuoteNotFound] : []));

    private StrategyDecision Decide(
        AiCoachModeDefinition mode,
        ModelTurnCandidate candidate,
        VerifiedPlanningContext verified,
        ConversationSnapshot? snapshot = null)
    {
        snapshot ??= Snapshot(mode);
        var planning = _readiness.Calculate(new PlanningReadinessContext(
            snapshot, verified, mode.Policy.Planning));
        return _postPolicy.Decide(new PolicyContext(
            snapshot, _prePolicy.Build(snapshot, mode), candidate, mode, verified, planning));
    }

    private static ModelTurnCandidate Candidate(
        ConversationStrategy action,
        AssistantResponseCandidate response,
        ProposalSetCandidate? proposals = null) => new(
        new InterpretationCandidate(IntentType.ConcreteAction), action, response, proposals);

    [Fact]
    public void PrePolicy_WithPendingSet_DoesNotExposeProposalCreation()
    {
        var mode = ExecutionModeDefinition.Create();
        var envelope = _prePolicy.Build(Snapshot(mode, PendingSet()), mode);

        envelope.ProposalConstraints.ProposalAllowed.Should().BeFalse();
        envelope.AllowedStrategies.Should().BeEquivalentTo(new[]
        {
            ConversationStrategy.ContinueListening,
            ConversationStrategy.DiscussExistingProposal,
        });
    }

    [Fact]
    public void PostPolicy_VerifiedActionProposal_IsAccepted()
    {
        var mode = ExecutionModeDefinition.Create();
        var decision = Decide(
            mode,
            Candidate(ConversationStrategy.ShowProposalSet,
                new ProposalIntroductionResponse("请确认。"), Proposals()),
            Verified(PlanningItemKind.Action));

        decision.DecisionType.Should().Be(StrategyDecisionType.Accepted);
        decision.AcceptProposalSetCandidate.Should().BeTrue();
    }

    [Fact]
    public void PostPolicy_InvalidCurrentClaimWithActiveIntent_RejectsModelProposal()
    {
        var mode = ExecutionModeDefinition.Create();
        var decision = Decide(
            mode,
            Candidate(ConversationStrategy.ShowProposalSet,
                new ProposalIntroductionResponse("请确认。"), Proposals()),
            Verified(invalidEvidence: true),
            Snapshot(mode, activePlanningIntent: ActiveIntent()));

        decision.DecisionType.Should().Be(StrategyDecisionType.RequiresRegeneration);
        decision.ReasonCode.Should().Be(StrategyReasonCode.EvidenceInvalid);
        decision.AcceptProposalSetCandidate.Should().BeFalse(
            because: "an active verified intent must not authorize a proposal containing current fabricated claims");
        decision.Fallback!.Action.Should().Be(PolicyFallbackAction.DeterministicProposal);
    }

    [Fact]
    public void PostPolicy_QuestionWhenProposalIsReady_ReturnsStructuredRegenerationDirective()
    {
        var mode = ExecutionModeDefinition.Create();
        var decision = Decide(
            mode,
            Candidate(ConversationStrategy.AskClarifyingQuestion,
                new ClarifyingQuestionResponse("什么时候？", "什么时候？")),
            Verified(PlanningItemKind.Action));

        decision.FinalStrategy.Should().Be(ConversationStrategy.ShowProposalSet);
        decision.DecisionType.Should().Be(StrategyDecisionType.RequiresRegeneration);
        decision.Regeneration.Should().NotBeNull();
        decision.Regeneration!.RequiredStrategy.Should().Be(ConversationStrategy.ShowProposalSet);
        decision.Fallback!.Action.Should().Be(PolicyFallbackAction.DeterministicProposal);
    }

    [Fact]
    public void PostPolicy_ContinueListeningWhenProposalIsReady_RequiresProposalRegeneration()
    {
        var mode = ExecutionModeDefinition.Create();
        var decision = Decide(
            mode,
            Candidate(ConversationStrategy.ContinueListening, new ListeningResponse("我再想想。")),
            Verified(PlanningItemKind.Action));

        decision.FinalStrategy.Should().Be(ConversationStrategy.ShowProposalSet);
        decision.DecisionType.Should().Be(StrategyDecisionType.RequiresRegeneration);
        decision.ReasonCode.Should().Be(StrategyReasonCode.ActionableIntentRequiresProposal);
        decision.Fallback!.Action.Should().Be(PolicyFallbackAction.DeterministicProposal);
    }

    [Fact]
    public void PostPolicy_UserRejection_BlocksProposal()
    {
        var mode = ExecutionModeDefinition.Create();
        var decision = Decide(
            mode,
            Candidate(ConversationStrategy.ShowProposalSet,
                new ProposalIntroductionResponse("请确认。"), Proposals()),
            Verified(PlanningItemKind.Action, UserTurnDisposition.RejectedAction));

        decision.FinalStrategy.Should().Be(ConversationStrategy.ContinueListening);
        decision.ReasonCode.Should().Be(StrategyReasonCode.UserRejectedAction);
        decision.AcceptProposalSetCandidate.Should().BeFalse();
    }

    [Fact]
    public void PostPolicy_ProposalOverPendingSet_IsDowngradedToDiscussion()
    {
        var mode = ExecutionModeDefinition.Create();
        var snapshot = Snapshot(mode, PendingSet());
        var decision = Decide(
            mode,
            Candidate(ConversationStrategy.ShowProposalSet,
                new ProposalIntroductionResponse("请确认。"), Proposals()),
            Verified(PlanningItemKind.Action),
            snapshot);

        decision.FinalStrategy.Should().Be(ConversationStrategy.DiscussExistingProposal);
        decision.ReasonCode.Should().Be(StrategyReasonCode.PendingProposalSetAlreadyExists);
    }

    [Fact]
    public void PostPolicy_ResponseMismatch_RequiresCorrectionWithoutChangingOwner()
    {
        var mode = ExecutionModeDefinition.Create();
        var decision = Decide(
            mode,
            Candidate(ConversationStrategy.AskClarifyingQuestion, new ListeningResponse("好的。")),
            Verified());

        decision.DecisionType.Should().Be(StrategyDecisionType.RequiresRegeneration);
        decision.Regeneration!.RequiredStrategy.Should().Be(ConversationStrategy.AskClarifyingQuestion);
    }

    [Fact]
    public void PostPolicy_ContinueListeningWithQuestionText_RequiresCorrection()
    {
        var mode = ExecutionModeDefinition.Create();
        var decision = Decide(
            mode,
            Candidate(ConversationStrategy.ContinueListening, new ListeningResponse("你想先做哪件事？")),
            Verified());

        decision.DecisionType.Should().Be(StrategyDecisionType.RequiresRegeneration);
        decision.ReasonCode.Should().Be(StrategyReasonCode.ResponseTypeMismatch);
        decision.FinalStrategy.Should().Be(ConversationStrategy.AskGentleQuestion);
        decision.Regeneration!.RequiredStrategy.Should().Be(ConversationStrategy.AskGentleQuestion);
        decision.Regeneration.RequiredFields.Should().BeEquivalentTo(["response"]);
        decision.AcceptResponseCandidate.Should().BeFalse();
    }

    [Fact]
    public void PostPolicy_InvalidCurrentEvidenceWithoutVerifiedMaterial_RequiresCorrection()
    {
        var mode = ExecutionModeDefinition.Create();
        var decision = Decide(
            mode,
            Candidate(ConversationStrategy.ContinueListening, new ListeningResponse("好的，我继续帮你整理。")),
            Verified(invalidEvidence: true));

        decision.DecisionType.Should().Be(StrategyDecisionType.RequiresRegeneration);
        decision.ReasonCode.Should().Be(StrategyReasonCode.EvidenceInvalid);
        decision.Regeneration!.RequiredFields.Should().Contain("interpretation");
    }

    [Fact]
    public void PostPolicy_AcknowledgementWithoutNewPlanningMaterial_UsesSafeFallback()
    {
        var mode = ExecutionModeDefinition.Create();
        var decision = Decide(
            mode,
            Candidate(ConversationStrategy.ContinueListening,
                new ListeningResponse("我会继续帮你整理。")),
            Verified(disposition: UserTurnDisposition.Answered),
            Snapshot(mode, activePlanningIntent: GoalIntent()));

        decision.DecisionType.Should().Be(StrategyDecisionType.Downgraded);
        decision.ReasonCode.Should().Be(StrategyReasonCode.NoNewPlanningMaterial);
        decision.FinalStrategy.Should().Be(ConversationStrategy.ContinueListening);
        decision.Fallback!.Action.Should().Be(PolicyFallbackAction.SafeResponse);
    }
}

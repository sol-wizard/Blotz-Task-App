using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Kernel;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public class ProposalSetMutationKernelTests
{
    private static readonly AiCoachModeDefinition Mode = ExecutionModeDefinition.Create();
    private readonly ConversationKernel _kernel = new();

    [Fact]
    public void Handle_ValidatedMutation_ReplacesCardAndCommitsAcknowledgementAtomically()
    {
        // Arrange
        var original = Proposal("准备材料");
        var set = PendingSet(original);
        var changed = original with { StartTime = new TimeOnly(19, 0), EndTime = new TimeOnly(19, 30) };
        var verdict = ReadyVerdict(set, [changed], discarded: false);
        var outcome = Outcome("已更新卡片。", verdict);

        // Act
        var transition = _kernel.Apply(
            Snapshot(set),
            new ModelTurnCompleted(Guid.NewGuid(), 3, outcome),
            Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue(because: "the mutation targets the current pending set version");
        transition.Mutations.Should().ContainSingle(mutation => mutation is ReplaceProposalsMutation,
            because: "the complete validated card is replaced in one Kernel transition");
        transition.Mutations.Should().ContainSingle(mutation => mutation is AppendAssistantMessageMutation,
            because: "the acknowledgement and card change must commit together");
        transition.NextPhase.Should().Be(ConversationPhase.ActionPending,
            because: "a non-empty updated card remains pending confirmation");
        transition.Events.Should().ContainSingle(@event => @event is ProposalSetUpdated,
            because: "observers need an authoritative update event rather than model text");
    }

    [Fact]
    public void Handle_MutationRemovingEveryItem_RejectsAndClearsCurrentCard()
    {
        // Arrange
        var set = PendingSet(Proposal("准备材料"));
        var verdict = ReadyVerdict(set, [], discarded: true);

        // Act
        var transition = _kernel.Apply(
            Snapshot(set),
            new ModelTurnCompleted(Guid.NewGuid(), 3, Outcome("已移除草案。", verdict)),
            Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue(because: "an explicit remove-all mutation has already passed policy and guards");
        transition.NextPhase.Should().Be(ConversationPhase.FollowUp,
            because: "an empty pending set is represented as a rejected lifecycle result, not an empty card");
        transition.Mutations.Should().Contain(mutation => mutation is UpdateProposalSetStatusMutation,
            because: "the historical proposal set must record its terminal rejected status");
        transition.Mutations.Should().Contain(mutation => mutation is ClearCurrentProposalSetMutation,
            because: "the discarded card must no longer be current");
        transition.AllowedActions.Should().BeEquivalentTo(
            new[] { ConversationAction.SendMessage },
            because: "card actions disappear after the draft is discarded");
    }

    [Fact]
    public void Handle_MutationForStaleCardVersion_IsRejected()
    {
        // Arrange
        var set = PendingSet(Proposal("准备材料"));
        var staleVerdict = ReadyVerdict(set with { Version = set.Version - 1 }, set.Proposals, discarded: false);

        // Act
        var transition = _kernel.Apply(
            Snapshot(set),
            new ModelTurnCompleted(Guid.NewGuid(), 3, Outcome("已更新卡片。", staleVerdict)),
            Mode);

        // Assert
        transition.IsAccepted.Should().BeFalse(because: "a late model result must not overwrite a newer card");
        transition.Rejection.Should().Be(TransitionRejection.ProposalSetNotCurrent,
            because: "artifact identity and base version are checked together");
    }

    private static ConversationSnapshot Snapshot(ProposalSetSnapshot set) => new(
        Guid.NewGuid(),
        Guid.NewGuid(),
        AiCoachMode.Execution,
        ConversationPhase.ActionPending,
        GenerationStatus.Running,
        BlockedReason.None,
        Version: 3,
        set,
        OpenQuestion: null,
        new HashSet<ConversationFact> { ConversationFact.HasPendingProposalSet, ConversationFact.HasRunningModelEffect },
        new HashSet<ConversationAction>(),
        Mode.ToRuntimeVersions(2));

    private static ProposalSetSnapshot PendingSet(params TaskProposal[] proposals) => new(
        Guid.NewGuid(), ProposalSet.SchemaVersion, ProposalSetStatus.Pending, Version: 4, proposals);

    private static TaskProposal Proposal(string title) => new(
        Guid.NewGuid(), title, null,
        new DateOnly(2026, 9, 18), new TimeOnly(9, 0), new TimeOnly(9, 30),
        "Australia/Perth", null);

    private static ProposalSetMutationVerdict ReadyVerdict(
        ProposalSetSnapshot set,
        IReadOnlyList<TaskProposal> proposals,
        bool discarded) => new(
        ProposalSetMutationReadiness.ReadyToApply,
        ProposalSetMutationReason.None,
        set.Id,
        set.Version,
        proposals,
        new ProposalSetMutationSummary(
            0, discarded ? 0 : 1, discarded ? set.Proposals.Count : 0,
            [], discarded ? [] : proposals.Select(proposal => proposal.Title).ToList(),
            discarded ? set.Proposals.Select(proposal => proposal.Title).ToList() : [],
            discarded,
            proposals.Count),
        null);

    private static ValidatedTurnOutcome Outcome(
        string message,
        ProposalSetMutationVerdict verdict) => new(
        ConversationStrategy.UpdateProposalSet,
        StrategyDecisionType.Accepted,
        StrategyReasonCode.None,
        message,
        Question: null,
        AcceptedProposals: null,
        FallbackUsed: false,
        AcceptedProposalSetMutation: verdict);
}

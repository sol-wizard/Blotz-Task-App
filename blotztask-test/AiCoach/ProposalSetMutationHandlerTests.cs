using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public class ProposalSetMutationHandlerTests
{
    private readonly ProposalSetMutationHandler _handler = new();

    [Fact]
    public void Handle_MixedAddUpdateRemove_ReturnsOneAtomicCard()
    {
        // Arrange
        const string message = "删除第二条，把第一条改到晚上7点，再加一条确认地点";
        var current = PendingSet(Proposal("准备材料"), Proposal("联系场地"));
        var candidate = new ProposalSetMutationCandidate(
            ProposalReferenceKeys.CurrentArtifact,
            [
                new RemoveProposalItemCandidate("remove_1", "item_2", new EvidenceReference("删除第二条")),
                new UpdateProposalItemCandidate(
                    "update_1",
                    "item_1",
                    new ProposalItemPatchCandidate(
                        new HashSet<ProposalField> { ProposalField.StartTime, ProposalField.EndTime },
                        StartTime: new TimeOnly(19, 0),
                        EndTime: new TimeOnly(19, 30)),
                    new EvidenceReference("把第一条改到晚上7点")),
                new AddProposalItemCandidate(
                    "add_1",
                    Candidate("确认地点", 20),
                    new EvidenceReference("再加一条确认地点")),
            ],
            []);

        // Act
        var verdict = _handler.Evaluate(current, candidate, message, ProposalSet.MaxProposals);

        // Assert
        verdict.IsReady.Should().BeTrue(because: "all three operations have unique targets and current-message evidence");
        verdict.Proposals.Should().HaveCount(2, because: "one item is removed and one is added");
        verdict.Proposals![0].StartTime.Should().Be(new TimeOnly(19, 0),
            because: "the update must preserve identity while replacing only requested fields");
        verdict.Proposals[0].Title.Should().Be("准备材料",
            because: "fields absent from the patch must remain unchanged");
        verdict.Proposals[1].Title.Should().Be("确认地点",
            because: "the added item must be appended to the resulting card");
        verdict.Summary.Should().BeEquivalentTo(new
        {
            AddedCount = 1,
            UpdatedCount = 1,
            RemovedCount = 1,
            SetDiscarded = false,
            ResultingItemCount = 2,
        }, because: "the authoritative response is projected from the applied result");
    }

    [Fact]
    public void Handle_AmbiguousTarget_RequiresClarificationWithoutMaterializingChanges()
    {
        // Arrange
        var current = PendingSet(Proposal("准备材料"), Proposal("联系场地"));
        var candidate = new ProposalSetMutationCandidate(
            ProposalReferenceKeys.CurrentArtifact,
            [],
            [new ProposalMutationAmbiguityCandidate(
                ProposalMutationAmbiguityKind.TargetUnclear,
                ["item_1", "item_2"],
                null,
                new EvidenceReference("把那个删掉"))]);

        // Act
        var verdict = _handler.Evaluate(current, candidate, "把那个删掉", ProposalSet.MaxProposals);

        // Assert
        verdict.Readiness.Should().Be(ProposalSetMutationReadiness.NeedsClarification,
            because: "a destructive target must never be guessed");
        verdict.Proposals.Should().BeNull(because: "no clear subset may be applied before ambiguity is resolved");
        verdict.Summary.Should().BeNull(because: "no operation has been accepted");
    }

    [Fact]
    public void Handle_SameTargetUpdatedAndRemoved_RejectsTheWholeMutation()
    {
        // Arrange
        const string message = "把第一条改到晚上，然后删掉第一条";
        var current = PendingSet(Proposal("准备材料"));
        var candidate = new ProposalSetMutationCandidate(
            ProposalReferenceKeys.CurrentArtifact,
            [
                new UpdateProposalItemCandidate(
                    "update_1",
                    "item_1",
                    new ProposalItemPatchCandidate(
                        new HashSet<ProposalField> { ProposalField.StartTime, ProposalField.EndTime },
                        StartTime: new TimeOnly(19, 0), EndTime: new TimeOnly(19, 30)),
                    new EvidenceReference("把第一条改到晚上")),
                new RemoveProposalItemCandidate("remove_1", "item_1", new EvidenceReference("删掉第一条")),
            ],
            []);

        // Act
        var verdict = _handler.Evaluate(current, candidate, message, ProposalSet.MaxProposals);

        // Assert
        verdict.Readiness.Should().Be(ProposalSetMutationReadiness.Invalid,
            because: "operation ordering must not decide contradictory instructions accidentally");
        verdict.Reason.Should().Be(ProposalSetMutationReason.TargetConflict,
            because: "each original target can be changed at most once per atomic mutation");
        verdict.Proposals.Should().BeNull(because: "one conflict rejects every operation");
    }

    [Fact]
    public void Handle_RemoveEveryItem_ReturnsDiscardResultInsteadOfEmptyPendingCard()
    {
        // Arrange
        const string message = "全部删掉";
        var current = PendingSet(Proposal("准备材料"), Proposal("联系场地"));
        var candidate = new ProposalSetMutationCandidate(
            ProposalReferenceKeys.CurrentArtifact,
            [
                new RemoveProposalItemCandidate("remove_1", "item_1", new EvidenceReference(message)),
                new RemoveProposalItemCandidate("remove_2", "item_2", new EvidenceReference(message)),
            ],
            []);

        // Act
        var verdict = _handler.Evaluate(current, candidate, message, ProposalSet.MaxProposals);

        // Assert
        verdict.DiscardsSet.Should().BeTrue(because: "a pending proposal set may not persist with zero items");
        verdict.Proposals.Should().BeEmpty(because: "the Kernel will reject and clear the card instead");
        verdict.Summary!.RemovedCount.Should().Be(2, because: "the acknowledgement must report actual removals");
    }

    [Fact]
    public void Handle_OperationQuoteNotInCurrentMessage_RejectsMutation()
    {
        // Arrange
        var current = PendingSet(Proposal("准备材料"));
        var candidate = new ProposalSetMutationCandidate(
            ProposalReferenceKeys.CurrentArtifact,
            [new RemoveProposalItemCandidate("remove_1", "item_1", new EvidenceReference("删除第一条"))],
            []);

        // Act
        var verdict = _handler.Evaluate(current, candidate, "这条看起来不错", ProposalSet.MaxProposals);

        // Assert
        verdict.Reason.Should().Be(ProposalSetMutationReason.EvidenceInvalid,
            because: "a model-created destructive instruction cannot substitute for current user evidence");
        verdict.Proposals.Should().BeNull(because: "invalid evidence rejects the complete mutation");
    }

    private static ProposalSetSnapshot PendingSet(params TaskProposal[] proposals) => new(
        Guid.NewGuid(), ProposalSet.SchemaVersion, ProposalSetStatus.Pending, Version: 4, proposals);

    private static TaskProposal Proposal(string title) => new(
        Guid.NewGuid(), title, null,
        new DateOnly(2026, 9, 18), new TimeOnly(9, 0), new TimeOnly(9, 30),
        "Australia/Perth", null);

    private static TaskProposalCandidate Candidate(string title, int hour) => new(
        $"add_{title}", title, null,
        new DateOnly(2026, 9, 18), new TimeOnly(hour, 0), new TimeOnly(hour, 30), null);
}

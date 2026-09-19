using BlotzTask.Modules.AiCoach.Ai.Contracts;
using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public class ProposalSetMutationPolicyTests
{
    private static readonly AiCoachModeDefinition Mode = ExecutionModeDefinition.Create();
    private readonly ConversationPostPolicy _policy = new();

    [Fact]
    public void Handle_ReadyCardMutation_AcceptsOnlyTheValidatedMutationCandidate()
    {
        // Arrange
        var snapshot = Snapshot();
        var mutation = MutationCandidate([]);
        var candidate = Candidate(
            ConversationStrategy.UpdateProposalSet,
            new ProposalUpdateResponse("好的，我来更新卡片。"),
            mutation);
        var verdict = ReadyVerdict(snapshot.CurrentProposalSet!);

        // Act
        var decision = _policy.Decide(Context(snapshot, candidate, verdict));

        // Assert
        decision.FinalStrategy.Should().Be(ConversationStrategy.UpdateProposalSet,
            because: "Post-Policy is the sole owner of the accepted card-update strategy");
        decision.AcceptProposalSetMutationCandidate.Should().BeTrue(
            because: "only a complete mutation result from the deterministic handler may reach the Kernel");
        decision.AcceptProposalSetCandidate.Should().BeFalse(
            because: "updating the current card is distinct from creating a second card");
    }

    [Fact]
    public void Handle_AmbiguousCardMutation_RequiresOneClarifyingQuestion()
    {
        // Arrange
        var snapshot = Snapshot();
        var ambiguity = new ProposalMutationAmbiguityCandidate(
            ProposalMutationAmbiguityKind.TargetUnclear,
            ["item_1", "item_2"],
            null,
            new EvidenceReference("把那个删掉"));
        var candidate = Candidate(
            ConversationStrategy.UpdateProposalSet,
            new ProposalUpdateResponse("我已经删掉了。"),
            MutationCandidate([ambiguity]));
        var verdict = ProposalSetMutationVerdict.Clarification("The target is not unique.");

        // Act
        var decision = _policy.Decide(Context(snapshot, candidate, verdict));

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.RequiresRegeneration,
            because: "uncertainty must become a question rather than a guessed destructive operation");
        decision.FinalStrategy.Should().Be(ConversationStrategy.AskClarifyingQuestion,
            because: "the user must resolve the target before any card mutation is accepted");
        decision.AcceptProposalSetMutationCandidate.Should().BeFalse(
            because: "no clear subset is applied while one operation remains ambiguous");
        decision.Regeneration!.RequiredFields.Should().Contain("proposalSetMutation",
            because: "the repaired response must preserve the explicit ambiguity contract");
    }

    [Fact]
    public void Handle_SchemaFiveMutation_ParsesTypedUpdatePatch()
    {
        // Arrange
        const string json = """
        {
          "interpretation": {
            "intent": "concrete_action",
            "planningItems": [],
            "constraints": [],
            "disposition": { "kind": "not_applicable", "evidence": null },
            "actionRequest": { "kind": "referenced_instruction", "evidence": { "quote": "第一条改到晚上7点" } },
            "supportRequest": { "kind": "unspecified", "evidence": null, "scope": "turn" }
          },
          "suggestedAction": "update_proposal_set",
          "response": {
            "type": "proposal_update",
            "text": "好的，我来更新。",
            "question": null,
            "questionTopic": null,
            "supportMove": null
          },
          "proposalSet": null,
          "proposalSetMutation": {
            "artifactReferenceKey": "current_card",
            "operations": [{
              "kind": "update",
              "operationKey": "update_1",
              "targetReferenceKey": "item_1",
              "changedFields": ["start_time", "end_time"],
              "title": null,
              "description": null,
              "date": null,
              "startTime": "19:00",
              "endTime": "19:30",
              "labelId": null,
              "evidence": { "quote": "第一条改到晚上7点" }
            }],
            "ambiguities": []
          }
        }
        """;

        // Act
        var parsed = ModelTurnCandidateContract.Parse(json);

        // Assert
        parsed.IsSuccess.Should().BeTrue(because: "schema five must represent a field-level card update without server IDs");
        parsed.Candidate!.SuggestedAction.Should().Be(ConversationStrategy.UpdateProposalSet,
            because: "the update strategy is now an explicit model candidate");
        var update = parsed.Candidate.ProposalSetMutationCandidate!.Operations
            .Should().ContainSingle(because: "the request changes exactly one original item")
            .Which.Should().BeOfType<UpdateProposalItemCandidate>().Which;
        update.TargetReferenceKey.Should().Be("item_1",
            because: "the model uses the ephemeral execution-frame reference");
        update.Patch.ChangedFields.Should().BeEquivalentTo(
            new[] { ProposalField.StartTime, ProposalField.EndTime },
            because: "unmentioned card fields must be preserved by the handler");
    }

    private static PolicyContext Context(
        ConversationSnapshot snapshot,
        ModelTurnCandidate candidate,
        ProposalSetMutationVerdict verdict) => new(
        snapshot,
        new ConversationPrePolicy().Build(snapshot, Mode),
        candidate,
        Mode,
        new VerifiedPlanningContext(
            [], [], UserTurnDisposition.NotApplicable,
            new EvidenceSummary(0, 0, [])),
        new PlanningAuthority(
            false,
            ProposalDisposition.Forbidden,
            ClarificationDisposition.NotAllowed,
            PlanningContextReadiness.Insufficient,
            [],
            []),
        Support: null,
        ProposalMutation: verdict);

    private static ModelTurnCandidate Candidate(
        ConversationStrategy strategy,
        AssistantResponseCandidate response,
        ProposalSetMutationCandidate mutation) => new(
        new InterpretationCandidate(IntentType.ConcreteAction),
        strategy,
        response,
        ProposalSetCandidate: null,
        SuggestedSupportMove: null,
        ProposalSetMutationCandidate: mutation);

    private static ProposalSetMutationCandidate MutationCandidate(
        IReadOnlyList<ProposalMutationAmbiguityCandidate> ambiguities) => new(
        ProposalReferenceKeys.CurrentArtifact,
        [],
        ambiguities);

    private static ProposalSetMutationVerdict ReadyVerdict(ProposalSetSnapshot set) => new(
        ProposalSetMutationReadiness.ReadyToApply,
        ProposalSetMutationReason.None,
        set.Id,
        set.Version,
        set.Proposals,
        new ProposalSetMutationSummary(0, 1, 0, [], [set.Proposals[0].Title], [], false, set.Proposals.Count),
        null);

    private static ConversationSnapshot Snapshot()
    {
        var set = new ProposalSetSnapshot(
            Guid.NewGuid(),
            ProposalSet.SchemaVersion,
            ProposalSetStatus.Pending,
            Version: 2,
            [Proposal("准备材料"), Proposal("联系场地")]);
        return new ConversationSnapshot(
            Guid.NewGuid(),
            Guid.NewGuid(),
            AiCoachMode.Execution,
            ConversationPhase.ActionPending,
            GenerationStatus.Running,
            BlockedReason.None,
            Version: 3,
            set,
            OpenQuestion: null,
            new HashSet<ConversationFact> { ConversationFact.HasPendingProposalSet },
            new HashSet<ConversationAction>(),
            Mode.ToRuntimeVersions(2));
    }

    private static TaskProposal Proposal(string title) => new(
        Guid.NewGuid(), title, null,
        new DateOnly(2026, 9, 18), new TimeOnly(9, 0), new TimeOnly(9, 30),
        "Australia/Perth", null);
}

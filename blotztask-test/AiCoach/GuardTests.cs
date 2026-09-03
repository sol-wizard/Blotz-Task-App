using BlotzTask.Modules.AiCoach.Ai.Contracts;
using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Guards;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

/// <summary>
/// Guard pipeline tests (v3 tech design §14) plus the Model Output Schema Guard (the candidate
/// contract parser).
/// </summary>
public class GuardTests
{
    private const string TimeZone = "Australia/Sydney";

    // ---------- Evidence Guard ----------

    [Fact]
    public void Evidence_QuoteFromCurrentMessage_IsVerified()
    {
        // Arrange
        var guard = new EvidenceGuard();
        var interpretation = Interpretation("任务", "帮我列出可能需要完成的任务");

        // Act
        var verdict = guard.Verify(interpretation, "帮我列出可能需要完成的任务");

        // Assert
        verdict.Items.Should().ContainSingle(because: "the quote is literally in the current message");
    }

    [Fact]
    public void Evidence_IsWhitespaceInsensitive()
    {
        // Arrange
        var guard = new EvidenceGuard();
        var interpretation = Interpretation("plan", "help me plan this");

        // Act
        var verdict = guard.Verify(interpretation, "Could you  help me\nplan this today?");

        // Assert
        verdict.Items.Should().ContainSingle(because: "quoting must not fail on formatting differences");
    }

    [Fact]
    public void Evidence_FabricatedQuote_IsNotVerified()
    {
        // Arrange
        var guard = new EvidenceGuard();
        var interpretation = Interpretation("明天的任务", "帮我安排明天的任务");

        // Act
        var verdict = guard.Verify(interpretation, "我今天有点累");

        // Assert
        verdict.Items.Should().BeEmpty(
            because: "a quote that is not in the current message is model inference, not user evidence");
        verdict.Evidence.Issues.Should().Contain(EvidenceIssue.QuoteNotFound);
    }

    [Fact]
    public void Evidence_IntentClaimedWithoutAQuote_IsNotVerified()
    {
        // Arrange
        var guard = new EvidenceGuard();
        var interpretation = Interpretation("明天的任务", "");

        // Act
        var verdict = guard.Verify(interpretation, "帮我安排明天的任务");

        // Assert
        verdict.Items.Should().BeEmpty(because: "UserExplicit evidence requires the quote itself");
        verdict.Evidence.Issues.Should().Contain(EvidenceIssue.MissingQuote);
    }

    [Fact]
    public void Evidence_FabricatedDisposition_DoesNotBecomeVerifiedAuthorization()
    {
        var guard = new EvidenceGuard();
        var interpretation = new InterpretationCandidate(
            IntentType.Goal,
            [new PlanningItemCandidate("写论文", new EvidenceReference("写论文"), PlanningItemKind.Goal)],
            [],
            new UserTurnDispositionCandidate(
                UserTurnDisposition.DelegatedToCoach,
                new EvidenceReference("你决定")));

        var verdict = guard.Verify(interpretation, "我想写论文");

        verdict.Disposition.Should().Be(UserTurnDisposition.NotApplicable);
        verdict.Evidence.Issues.Should().Contain(EvidenceIssue.QuoteNotFound);
    }

    [Fact]
    public void Evidence_DelegationQuote_CannotProveAnInventedPlanningItem()
    {
        var guard = new EvidenceGuard();
        var interpretation = new InterpretationCandidate(
            IntentType.Goal,
            [new PlanningItemCandidate("检索参考资料", new EvidenceReference("帮我安排"), PlanningItemKind.Action)],
            [],
            new UserTurnDispositionCandidate(
                UserTurnDisposition.DelegatedToCoach,
                new EvidenceReference("帮我安排")));

        var verdict = guard.Verify(interpretation, "帮我安排");

        verdict.Items.Should().BeEmpty();
        verdict.Disposition.Should().Be(UserTurnDisposition.DelegatedToCoach);
        verdict.Evidence.VerifiedClaims.Should().Be(1,
            because: "a verified disposition is itself a verified evidence claim");
        verdict.Evidence.Issues.Should().Contain(EvidenceIssue.ClaimNotSupportedByQuote);
    }

    private static InterpretationCandidate Interpretation(string text, string quote) => new(
        IntentType.ConcreteAction,
        [new PlanningItemCandidate(text, new EvidenceReference(quote), PlanningItemKind.Action)]);

    // ---------- ProposalSet Guard ----------

    private static readonly ProposalConstraints Constraints = new(
        MaxProposals: ProposalSet.MaxProposals,
        ProposalAllowed: true);

    private static ConversationSnapshot EmptySnapshot()
    {
        var mode = ExecutionModeDefinition.Create();
        return new ConversationSnapshot(
            Guid.NewGuid(), Guid.NewGuid(), AiCoachMode.Execution,
            ConversationPhase.Conversing, GenerationStatus.Running, BlockedReason.None, 1,
            null, null, new HashSet<ConversationFact>(), new HashSet<ConversationAction>(),
            mode.ToRuntimeVersions(2));
    }

    private static TaskProposalCandidate CandidateProposal(
        string title = "整理资料",
        int startHour = 9,
        int endHour = 9,
        int endMinute = 30) => new(
        "p1", title, null, new DateOnly(2026, 8, 26),
        new TimeOnly(startHour, 0), new TimeOnly(endHour, endMinute), null);

    [Fact]
    public void ProposalSet_Valid_MaterializesServerOwnedProposals()
    {
        // Arrange
        var guard = new ProposalSetGuard();
        var candidate = new ProposalSetCandidate([CandidateProposal()]);

        // Act
        var verdict = guard.Validate(candidate, EmptySnapshot(), Constraints, TimeZone);

        // Assert
        verdict.IsValid.Should().BeTrue(verdict.Detail);
        var proposal = verdict.Proposals!.Single();
        proposal.ProposalId.Should().NotBeEmpty(because: "identity is server-assigned, never model-supplied");
        proposal.TimeZoneId.Should().Be(TimeZone, because: "the time zone comes from the conversation, not the model");
        proposal.PersistedTaskId.Should().BeNull();
    }

    [Fact]
    public void ProposalSet_EndBeforeStart_IsRejectedWhole()
    {
        // Arrange
        var guard = new ProposalSetGuard();
        var candidate = new ProposalSetCandidate(
            [CandidateProposal(), CandidateProposal("回复邮件", startHour: 10, endHour: 9)]);

        // Act
        var verdict = guard.Validate(candidate, EmptySnapshot(), Constraints, TimeZone);

        // Assert
        verdict.IsValid.Should().BeFalse(because: "one invalid proposal rejects the whole candidate — never half a card");
    }

    [Fact]
    public void ProposalSet_DuplicateProposals_AreRejected()
    {
        // Arrange
        var guard = new ProposalSetGuard();
        var candidate = new ProposalSetCandidate([CandidateProposal(), CandidateProposal()]);

        // Act
        var verdict = guard.Validate(candidate, EmptySnapshot(), Constraints, TimeZone);

        // Assert
        verdict.IsValid.Should().BeFalse();
        verdict.Detail.Should().Contain("duplicate");
    }

    [Fact]
    public void ProposalSet_OverAnOpenSet_IsRejected()
    {
        // Arrange
        var guard = new ProposalSetGuard();
        var mode = ExecutionModeDefinition.Create();
        var snapshot = new ConversationSnapshot(
            Guid.NewGuid(), Guid.NewGuid(), AiCoachMode.Execution,
            ConversationPhase.ActionPending, GenerationStatus.Running, BlockedReason.None, 2,
            new ProposalSetSnapshot(Guid.NewGuid(), ProposalSet.SchemaVersion, ProposalSetStatus.Pending, 1,
                [new TaskProposal(Guid.NewGuid(), "已有任务", null, new DateOnly(2026, 8, 26),
                    new TimeOnly(8, 0), new TimeOnly(8, 30), TimeZone, null)]),
            null, new HashSet<ConversationFact>(), new HashSet<ConversationAction>(),
            mode.ToRuntimeVersions(2));

        // Act
        var verdict = guard.Validate(new ProposalSetCandidate([CandidateProposal()]), snapshot, Constraints, TimeZone);

        // Assert
        verdict.IsValid.Should().BeFalse(because: "the single-open-set invariant is enforced independently here too");
    }

    [Fact]
    public void ProposalSet_TitleOverLimit_IsRejected()
    {
        // Arrange
        var guard = new ProposalSetGuard();
        var candidate = new ProposalSetCandidate([CandidateProposal(new string('长', 121))]);

        // Act
        var verdict = guard.Validate(candidate, EmptySnapshot(), Constraints, TimeZone);

        // Assert
        verdict.IsValid.Should().BeFalse();
    }

    // ---------- Response Guard ----------

    [Fact]
    public void Response_EmptyText_IsInvalid()
    {
        // Arrange
        var guard = new ResponseGuard();

        // Act
        var verdict = guard.Validate(new ListeningResponse("  "), new ResponseConstraints(1, 1200));

        // Assert
        verdict.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Response_OverTheLengthBudget_IsInvalid()
    {
        // Arrange
        var guard = new ResponseGuard();

        // Act
        var verdict = guard.Validate(
            new ListeningResponse(new string('x', 1201)), new ResponseConstraints(1, 1200));

        // Assert
        verdict.IsValid.Should().BeFalse();
    }

    // ---------- Model Output Schema Guard (contract parser) ----------

    [Fact]
    public void Parser_ValidProposalTurn_ProducesATypedCandidate()
    {
        // Arrange
        const string json = """
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

        // Act
        var result = ModelTurnCandidateContract.Parse(json);

        // Assert
        result.IsSuccess.Should().BeTrue(result.Error);
        var candidate = result.Candidate!;
        candidate.SuggestedAction.Should().Be(ConversationStrategy.ShowProposalSet);
        candidate.ResponseCandidate.Should().BeOfType<ProposalIntroductionResponse>();
        candidate.ProposalSetCandidate!.Proposals.Single().Date.Should().Be(new DateOnly(2026, 8, 26));
        candidate.Interpretation.PlanningItems!.Single().Evidence.Quote.Should().Be("明天要上班");
    }

    [Fact]
    public void Parser_MissingPlanningEvidence_RemainsVisibleToEvidenceGuard()
    {
        const string json = """
        {
          "interpretation": { "intent": "concrete_action",
            "planningItems": [ { "text": "上班", "kind": "action" } ],
            "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "排好了。", "question": null, "questionTopic": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "上班",
            "description": null, "date": "2026-08-26", "startTime": "09:00", "endTime": "17:00",
            "labelId": null } ] }
        }
        """;

        var parsed = ModelTurnCandidateContract.Parse(json);
        var verified = new EvidenceGuard().Verify(parsed.Candidate!.Interpretation, "明天要上班");

        parsed.IsSuccess.Should().BeTrue(parsed.Error);
        verified.Items.Should().BeEmpty();
        verified.Evidence.SubmittedClaims.Should().Be(1);
        verified.Evidence.Issues.Should().Contain(EvidenceIssue.MissingQuote);
    }

    [Fact]
    public void Parser_QuestionTypeWithoutAQuestion_Fails()
    {
        // Arrange
        const string json = """
        {
          "interpretation": { "intent": "goal", "planningItems": [], "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null } },
          "suggestedAction": "ask_clarifying_question",
          "response": { "type": "clarifying_question", "text": "你想先做哪件具体的事？", "question": null, "questionTopic": "concrete_step" },
          "proposalSet": null
        }
        """;

        // Act
        var result = ModelTurnCandidateContract.Parse(json);

        // Assert
        result.IsSuccess.Should().BeFalse(because: "the single question must be structurally present");
        result.Error.Should().Contain("question");
    }

    [Fact]
    public void Parser_MalformedDate_FailsWithACorrectableError()
    {
        // Arrange
        const string json = """
        {
          "interpretation": { "intent": "concrete_action",
            "planningItems": [ { "text": "上班", "kind": "action", "evidence": { "quote": "上班" } } ],
            "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null } },
          "suggestedAction": "show_proposal_set",
          "response": { "type": "proposal_introduction", "text": "好的。", "question": null, "questionTopic": null },
          "proposalSet": { "proposals": [ { "clientProposalKey": "p1", "title": "上班",
            "description": null, "date": "26/08/2026", "startTime": "09:00", "endTime": "17:00",
            "labelId": null } ] }
        }
        """;

        // Act
        var result = ModelTurnCandidateContract.Parse(json);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Contain("yyyy-MM-dd", because: "the error is echoed to the model for its one correction");
    }

    [Fact]
    public void Parser_KnownStrategyOutsideTheOutputEnum_StillParsesForPolicyToReject()
    {
        // Arrange
        const string json = """
        {
          "interpretation": { "intent": "goal", "planningItems": [], "constraints": [], "disposition": { "kind": "not_applicable", "evidence": null } },
          "suggestedAction": "update_proposal_set",
          "response": { "type": "listening", "text": "好的。", "question": null, "questionTopic": null },
          "proposalSet": null
        }
        """;

        // Act — update_proposal_set is a valid domain strategy but not in the model output contract.
        var result = ModelTurnCandidateContract.Parse(json);

        // Assert
        result.IsSuccess.Should().BeTrue(
            because: "the wire value maps to a known strategy; Post-Policy decides whether it is allowed");
        result.Candidate!.SuggestedAction.Should().Be(ConversationStrategy.UpdateProposalSet);
    }

    [Fact]
    public void Parser_GarbageOutput_Fails()
    {
        // Act
        var result = ModelTurnCandidateContract.Parse("I'll schedule that for you!");

        // Assert
        result.IsSuccess.Should().BeFalse();
    }
}

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
    public void Handle_PlanningClaimWithUnmatchedQuote_SourceValidationIsBypassed()
    {
        // Arrange
        var guard = new EvidenceGuard();
        var interpretation = Interpretation("明天的任务", "帮我安排明天的任务");

        // Act
        var verdict = guard.Verify(interpretation, "我今天有点累");

        // Assert
        verdict.Items.Should().ContainSingle(
            because: "source matching is temporarily disabled while planning interpretation is evaluated in production");
        verdict.Evidence.Issues.Should().NotContain(
            EvidenceIssue.QuoteNotFound,
            because: "an unmatched quote must not block the planning candidate while source validation is disabled");
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
    public void Handle_DispositionWithUnmatchedQuote_SourceValidationIsBypassed()
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

        verdict.Disposition.Should().Be(UserTurnDisposition.DelegatedToCoach,
            because: "source matching is temporarily disabled for non-empty disposition evidence");
        verdict.Evidence.Issues.Should().NotContain(
            EvidenceIssue.QuoteNotFound,
            because: "an unmatched quote must not reject the disposition while source validation is disabled");
    }

    [Fact]
    public void Handle_PlanningItemNotEntailedByQuote_SemanticValidationIsBypassed()
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

        verdict.Items.Should().ContainSingle(
            because: "quote-to-claim semantic validation is disabled together with source validation");
        verdict.Disposition.Should().Be(UserTurnDisposition.DelegatedToCoach);
        verdict.Evidence.VerifiedClaims.Should().Be(2,
            because: "both non-empty candidates pass while evidence semantics are not enforced");
        verdict.Evidence.Issues.Should().NotContain(
            EvidenceIssue.ClaimNotSupportedByQuote,
            because: "the semantic evidence rule is intentionally disabled");
    }

    [Theory]
    [InlineData(SupportRequestKind.WantsListening, "你听我说就好")]
    [InlineData(SupportRequestKind.WantsExploration, "陪我想想为什么")]
    [InlineData(SupportRequestKind.WantsPerspective, "你怎么看这件事")]
    [InlineData(SupportRequestKind.WantsAdvice, "你觉得我该怎么办")]
    [InlineData(SupportRequestKind.RejectsAdvice, "我现在不需要建议")]
    [InlineData(SupportRequestKind.WantsPause, "先别问了")]
    [InlineData(SupportRequestKind.ClearsPreference, "现在可以问我了")]
    [InlineData(SupportRequestKind.WantsListening, "Please just listen to me")]
    [InlineData(SupportRequestKind.WantsExploration, "Help me explore why this keeps happening")]
    [InlineData(SupportRequestKind.WantsPerspective, "What do you think about this?")]
    [InlineData(SupportRequestKind.WantsAdvice, "What should I do?")]
    [InlineData(SupportRequestKind.RejectsAdvice, "I'm not looking for advice")]
    [InlineData(SupportRequestKind.WantsPause, "Please stop asking questions")]
    [InlineData(SupportRequestKind.ClearsPreference, "You can ask me questions now")]
    public void Evidence_ExplicitSupportRequest_IsVerified(
        SupportRequestKind kind,
        string message)
    {
        // Arrange
        var interpretation = new InterpretationCandidate(
            IntentType.Emotional,
            SupportRequest: new SupportRequestCandidate(kind, new EvidenceReference(message)));

        // Act
        var verdict = new EvidenceGuard().Verify(interpretation, message);

        // Assert
        verdict.SupportRequest.Should().Be(
            new VerifiedSupportRequest(kind, message),
            because: "an explicit response-style request must remain available to Support Policy");
    }

    [Fact]
    public void Handle_EmotionalExpressionClassifiedAsListening_PreservesModelClassification()
    {
        // Arrange
        const string message = "英文没考好";
        var interpretation = new InterpretationCandidate(
            IntentType.Emotional,
            SupportRequest: new SupportRequestCandidate(
                SupportRequestKind.WantsListening,
                new EvidenceReference(message)));

        // Act
        var verdict = new EvidenceGuard().Verify(interpretation, message);

        // Assert
        verdict.SupportRequest.Should().Be(
            new VerifiedSupportRequest(SupportRequestKind.WantsListening, message),
            because: "the server no longer reinterprets the model's support classification from user-text keywords");
    }

    [Fact]
    public void Evidence_TurnScopedAdviceRequest_WithLiteralCurrentQuote_IsVerified()
    {
        // Arrange
        const string message = "具体办法是什么";
        var interpretation = new InterpretationCandidate(
            IntentType.Question,
            SupportRequest: new SupportRequestCandidate(
                SupportRequestKind.WantsAdvice,
                new EvidenceReference(message),
                SupportPreferenceScope.Turn));

        // Act
        var verdict = new EvidenceGuard().Verify(interpretation, message);

        // Assert
        verdict.SupportRequest.Should().Be(
            new VerifiedSupportRequest(
                SupportRequestKind.WantsAdvice,
                message,
                SupportPreferenceScope.Turn),
            because: "Evidence Guard verifies the current quote and must not replace the model's open-language interpretation with a keyword whitelist");
        verdict.Evidence.Issues.Should().NotContain(
            EvidenceIssue.ClaimNotSupportedByQuote,
            because: "semantic interpretation belongs to the model for a non-persistent turn preference");
    }

    [Fact]
    public void Handle_TurnScopedAdviceRequestWithUnmatchedQuote_SourceValidationIsBypassed()
    {
        // Arrange
        var interpretation = new InterpretationCandidate(
            IntentType.Question,
            SupportRequest: new SupportRequestCandidate(
                SupportRequestKind.WantsAdvice,
                new EvidenceReference("具体办法是什么"),
                SupportPreferenceScope.Turn));

        // Act
        var verdict = new EvidenceGuard().Verify(interpretation, "我再想想");

        // Assert
        verdict.SupportRequest.Should().Be(
            new VerifiedSupportRequest(
                SupportRequestKind.WantsAdvice,
                "具体办法是什么",
                SupportPreferenceScope.Turn),
            because: "source matching is temporarily disabled for a non-empty support request quote");
        verdict.Evidence.Issues.Should().NotContain(
            EvidenceIssue.QuoteNotFound,
            because: "an unmatched quote must not reject the support request while source validation is disabled");
    }

    [Theory]
    [InlineData(SupportRequestKind.WantsAdvice, "我现在不需要建议")]
    [InlineData(SupportRequestKind.WantsExploration, "先别问了")]
    [InlineData(SupportRequestKind.WantsAdvice, "I don't want advice")]
    [InlineData(SupportRequestKind.WantsExploration, "Please don't ask me questions")]
    public void Evidence_ConflictingOrImplicitSupportClaim_IsRejected(
        SupportRequestKind claimedKind,
        string message)
    {
        // Arrange
        var scope = claimedKind == SupportRequestKind.WantsAdvice
            ? SupportPreferenceScope.Conversation
            : SupportPreferenceScope.Turn;
        var interpretation = new InterpretationCandidate(
            IntentType.Emotional,
            SupportRequest: new SupportRequestCandidate(
                claimedKind,
                new EvidenceReference(message),
                scope));

        // Act
        var verdict = new EvidenceGuard().Verify(interpretation, message);

        // Assert
        verdict.SupportRequest.Should().BeNull(
            because: "retained prototype checks reject conflicting response preferences, especially persistent ones");
        verdict.Evidence.Issues.Should().Contain(
            EvidenceIssue.ClaimNotSupportedByQuote,
            because: "the rejected model claim must remain observable");
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

    [Fact]
    public void Handle_ListeningResponseWithQuestion_IsAcceptedWithoutTextInspection()
    {
        // Arrange
        var guard = new ResponseGuard();

        // Act
        var verdict = guard.Validate(
            new ListeningResponse("你现在最难受的是分数本身，还是担心后面怎么办？"),
            new ResponseConstraints(1, 1200));

        // Assert
        verdict.IsValid.Should().BeTrue(
            because: "Response Guard no longer infers response structure from punctuation in free text");
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

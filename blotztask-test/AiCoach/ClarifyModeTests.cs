using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Ai.Contracts;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Guards;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public class ClarifyModeTests
{
    private readonly PlanningAuthorityCalculator _calculator = new();

    [Fact]
    public void Handle_CreateClarifyDefinition_UsesMinimalPlanningBoundaries()
    {
        // Arrange & Act
        var mode = ClarifyModeDefinition.Create();

        // Assert
        mode.Policy.Planning.MaxClarificationAttempts.Should().Be(2,
            because: "Clarify must stop questioning after two committed planning clarifications");
        mode.Policy.Planning.DraftContext.Should().Be(DraftContextPolicy.TargetScopeAndGrounding,
            because: "a known goal, current state, and topic are sufficient for a tentative draft");
        mode.Policy.Planning.ClarificationExhaustion.Should().Be(
            ClarificationExhaustionBehavior.RequireTentativeProposal,
            because: "two exhausted clarification turns must lead to a tentative draft instead of another question");
        mode.Policy.Planning.ProposalTrigger.Should().Be(
            ProposalTriggerPolicy.ExplicitPlanningRequestOrDelegation,
            because: "mentioning an action is not planning authorization in Clarify mode");
        mode.Policy.AllowsModelProposalSetUpdates.Should().BeTrue(
            because: "a clear natural-language edit may reuse the shared pending-card mutation pipeline");
        mode.PersistencePolicy.Should().Be(ConversationPersistencePolicy.InMemoryOnly,
            because: "Clarify intentionally shares Execution mode's in-memory lifetime");
    }

    [Fact]
    public void Handle_PendingCardInClarifyMode_ExposesAutomaticMutationStrategy()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var pendingSet = new ProposalSetSnapshot(
            Guid.NewGuid(),
            ProposalSet.SchemaVersion,
            ProposalSetStatus.Pending,
            Version: 1,
            [new TaskProposal(
                Guid.NewGuid(), "整理方案", null,
                new DateOnly(2026, 9, 20), new TimeOnly(9, 0), new TimeOnly(9, 30),
                "Australia/Perth", null)]);
        var snapshot = Snapshot(mode) with
        {
            Phase = ConversationPhase.ActionPending,
            CurrentProposalSet = pendingSet,
        };

        // Act
        var envelope = new ConversationPrePolicy().Build(snapshot, mode);

        // Assert
        envelope.AllowedStrategies.Should().Contain(ConversationStrategy.UpdateProposalSet,
            because: "Clarify must expose the existing atomic mutation strategy while a card is pending");
        envelope.ProposalConstraints.ProposalAllowed.Should().BeFalse(
            because: "editing the pending card must not authorize creation of a second card");
    }

    [Theory]
    [InlineData(1, true)]
    [InlineData(2, false)]
    public void Handle_CalculateClarificationAuthority_EnforcesOnlyTheQuestionCeiling(
        int attempts,
        bool expected)
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var sourceMessageId = Guid.NewGuid();
        var intent = new ActivePlanningIntentSnapshot(
            Guid.NewGuid(),
            sourceMessageId,
            [new PlanningItemSnapshot(
                "理清职业方向", "职业方向", sourceMessageId, PlanningItemKind.Goal,
                Guid.NewGuid())],
            [],
            PlanningIntentStatus.Collecting,
            new HashSet<ClarificationTopic> { ClarificationTopic.Scope },
            attempts);
        var verified = EmptyVerified();

        // Act
        var authority = _calculator.Calculate(new PlanningAuthorityContext(
            Snapshot(mode, intent), verified, mode.Policy.Planning));

        // Assert
        authority.CanAskClarifyingQuestion.Should().Be(expected,
            because: "the server only caps total questions and does not prescribe which topic the model must ask");
    }

    [Fact]
    public void Handle_GoalCurrentStateAndTopicInClarifyMode_AuthorizesTentativeProposal()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var sourceMessageId = Guid.NewGuid();
        var intent = new ActivePlanningIntentSnapshot(
            Guid.NewGuid(),
            sourceMessageId,
            [
                new PlanningItemSnapshot(
                    "完成 AI 应用报告", "写报告", sourceMessageId, PlanningItemKind.Goal,
                    Guid.NewGuid()),
                new PlanningItemSnapshot(
                    "AI 如何应用到本系统", "AI如何应用到本系统", sourceMessageId,
                    PlanningItemKind.Domain, Guid.NewGuid()),
            ],
            [new PlanningConstraintSnapshot(
                "尚未开始，也没有提纲", "我准备开始写，但不知道如何开始", sourceMessageId)],
            PlanningIntentStatus.Collecting,
            new HashSet<ClarificationTopic> { ClarificationTopic.Scope },
            ClarificationAttempts: 1);
        var verified = EmptyVerified() with
        {
            Disposition = UserTurnDisposition.Answered,
        };

        // Act
        var snapshot = Snapshot(mode, intent) with
        {
            OpenQuestion = new OpenQuestionSnapshot(
                "还缺什么信息？", 1, intent.IntentId, ClarificationTopic.ConcreteStep),
        };

        var authority = _calculator.Calculate(new PlanningAuthorityContext(
            snapshot, verified, mode.Policy.Planning));

        // Assert
        authority.CanGenerateProposal.Should().BeTrue(
            because: "the product rule treats a verified goal, current-state constraint, and topic as sufficient context");
        authority.Proposal.Should().Be(ProposalDisposition.Optional,
            because: "established context permits a draft without forcing one before the clarification ceiling");
        authority.ContextReadiness.Should().Be(PlanningContextReadiness.Draftable,
            because: "goal, topic, and current-state grounding form reusable draft readiness");
        authority.Reasons.Should().Contain(PlanningAuthorityReason.EstablishedContextAvailable,
            because: "observability must distinguish context-based drafts from explicit planning requests");
    }

    [Fact]
    public void Handle_OpenQuestionAnswerWithPlanningMaterial_ReusesActiveIntentWithoutDispositionLabel()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var sourceMessageId = Guid.NewGuid();
        var intent = new ActivePlanningIntentSnapshot(
            Guid.NewGuid(),
            sourceMessageId,
            [new PlanningItemSnapshot(
                "完成报告", "写报告", sourceMessageId, PlanningItemKind.Goal, Guid.NewGuid())],
            [new PlanningConstraintSnapshot(
                "尚未开始", "我还没有开始", sourceMessageId)],
            PlanningIntentStatus.Collecting,
            new HashSet<ClarificationTopic> { ClarificationTopic.Scope },
            ClarificationAttempts: 1);
        var snapshot = Snapshot(mode, intent) with
        {
            OpenQuestion = new OpenQuestionSnapshot(
                "报告主题是什么？", 1, intent.IntentId, ClarificationTopic.Scope),
        };
        var verified = new VerifiedPlanningContext(
            [new VerifiedPlanningItem(
                "AI 如何应用到本系统", PlanningItemKind.Domain, "AI如何应用到本系统")],
            [],
            UserTurnDisposition.NotApplicable,
            new EvidenceSummary(1, 1, []),
            new VerifiedActionRequest(ActionRequestKind.None, null));

        // Act
        var authority = _calculator.Calculate(new PlanningAuthorityContext(
            snapshot, verified, mode.Policy.Planning));
        var update = PlanningStateRules.BuildPlanningIntentUpdate(
            snapshot, verified, authority, Guid.NewGuid(),
            proposalAccepted: false, AiCoachMode.Clarify);

        // Assert
        authority.CanGenerateProposal.Should().BeTrue(
            because: "new planning material answering the open question completes the established context");
        update.Should().NotBeNull(
            because: "the verified topic must be retained even when the model omits the answered disposition");
        update!.IntentId.Should().Be(intent.IntentId,
            because: "an answer to the active question belongs to its existing planning intent");
        update.Items.Should().HaveCount(2,
            because: "the retained goal and newly supplied topic must remain available together");
    }

    [Fact]
    public void Handle_TwoClarificationsWithPlanningMaterial_AuthorizesTentativeProposal()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var sourceMessageId = Guid.NewGuid();
        var intent = new ActivePlanningIntentSnapshot(
            Guid.NewGuid(),
            sourceMessageId,
            [new PlanningItemSnapshot(
                "完成报告", "写报告", sourceMessageId, PlanningItemKind.Goal, Guid.NewGuid())],
            [],
            PlanningIntentStatus.Collecting,
            new HashSet<ClarificationTopic>
            {
                ClarificationTopic.Scope,
                ClarificationTopic.ConcreteStep,
            },
            ClarificationAttempts: 2);
        var verified = EmptyVerified() with
        {
            Disposition = UserTurnDisposition.CannotProvide,
        };

        // Act
        var snapshot = Snapshot(mode, intent) with
        {
            OpenQuestion = new OpenQuestionSnapshot(
                "还缺什么信息？", 1, intent.IntentId, ClarificationTopic.ConcreteStep),
        };

        var authority = _calculator.Calculate(new PlanningAuthorityContext(
            snapshot, verified, mode.Policy.Planning));

        // Assert
        authority.CanAskClarifyingQuestion.Should().BeFalse(
            because: "the second committed planning clarification exhausts the Clarify question budget");
        authority.CanGenerateProposal.Should().BeTrue(
            because: "the product rule requires a tentative plan after two clarifications when planning material exists");
        authority.Proposal.Should().Be(ProposalDisposition.Required,
            because: "exhaustion is expressed as a stable proposal requirement rather than a reason-code protocol");
        authority.Clarification.Should().Be(ClarificationDisposition.Exhausted,
            because: "the typed authority must expose the exhausted clarification state directly");
        authority.Reasons.Should().Contain(PlanningAuthorityReason.ClarificationLimitReached,
            because: "the fallback authorization must remain explicit and observable");
    }

    [Fact]
    public void Handle_DraftableContextAfterTwoClarifications_RequiresTentativeProposal()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var sourceMessageId = Guid.NewGuid();
        var intent = new ActivePlanningIntentSnapshot(
            Guid.NewGuid(),
            sourceMessageId,
            [
                new PlanningItemSnapshot(
                    "完成报告", "写报告", sourceMessageId, PlanningItemKind.Goal, Guid.NewGuid()),
                new PlanningItemSnapshot(
                    "AI 应用", "AI应用", sourceMessageId, PlanningItemKind.Domain, Guid.NewGuid()),
            ],
            [new PlanningConstraintSnapshot("尚未开始", "尚未开始", sourceMessageId)],
            PlanningIntentStatus.Collecting,
            new HashSet<ClarificationTopic>
            {
                ClarificationTopic.Scope,
                ClarificationTopic.ConcreteStep,
            },
            ClarificationAttempts: 2);

        // Act
        var authority = _calculator.Calculate(new PlanningAuthorityContext(
            Snapshot(mode, intent), EmptyVerified(), mode.Policy.Planning));

        // Assert
        authority.ContextReadiness.Should().Be(PlanningContextReadiness.Draftable,
            because: "goal, topic, and current-state grounding remain sufficient after the ceiling");
        authority.Proposal.Should().Be(ProposalDisposition.Required,
            because: "an exhausted clarification policy must dominate the optional context-ready path");
    }

    [Fact]
    public void Handle_TwoClarificationsWithoutPlanningMaterial_DoesNotInventProposal()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var sourceMessageId = Guid.NewGuid();
        var intent = new ActivePlanningIntentSnapshot(
            Guid.NewGuid(),
            sourceMessageId,
            [],
            [],
            PlanningIntentStatus.Collecting,
            new HashSet<ClarificationTopic>
            {
                ClarificationTopic.Scope,
                ClarificationTopic.ConcreteStep,
            },
            ClarificationAttempts: 2);
        var verified = EmptyVerified() with
        {
            Disposition = UserTurnDisposition.CannotProvide,
        };

        // Act
        var snapshot = Snapshot(mode, intent) with
        {
            OpenQuestion = new OpenQuestionSnapshot(
                "还缺什么信息？", 1, intent.IntentId, ClarificationTopic.ConcreteStep),
        };

        var authority = _calculator.Calculate(new PlanningAuthorityContext(
            snapshot, verified, mode.Policy.Planning));

        // Assert
        authority.CanGenerateProposal.Should().BeFalse(
            because: "the two-turn fallback may use verified material but must not invent a goal from an empty intent");
    }

    [Fact]
    public void Handle_RequiredProposalMissing_RequiresTentativeProposalRegeneration()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var snapshot = Snapshot(mode);
        var verified = EmptyVerified();
        var authority = new PlanningAuthority(
            IsBlocked: false,
            Proposal: ProposalDisposition.Required,
            Clarification: ClarificationDisposition.Exhausted,
            ContextReadiness: PlanningContextReadiness.Insufficient,
            [],
            [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                AllowedAssumption.NextAvailableSlot]);
        var question = "还需要补充什么？";
        var candidate = new ModelTurnCandidate(
            new InterpretationCandidate(IntentType.Goal),
            ConversationStrategy.AskClarifyingQuestion,
            new ClarifyingQuestionResponse(question, question, ClarificationTopic.Other),
            ProposalSetCandidate: null);
        var envelope = new ConversationPrePolicy().Build(snapshot, mode);

        // Act
        var decision = new ConversationPostPolicy().Decide(new PolicyContext(
            snapshot, envelope, candidate, mode, verified, authority));

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.RequiresRegeneration,
            because: "the second clarification is a hard exit from further planning questions");
        decision.FinalStrategy.Should().Be(ConversationStrategy.ShowProposalSet,
            because: "the product rule requires a tentative proposal after the two-question limit");
        decision.ReasonCode.Should().Be(StrategyReasonCode.RequiredProposalMissing,
            because: "Post-Policy reacts to the stable requirement without knowing why it was required");
        decision.Fallback!.Action.Should().Be(PolicyFallbackAction.DeterministicProposal,
            because: "a failed model repair must still use the already-authorized tentative proposal path");
    }

    [Fact]
    public void Handle_ActionMentionInClarifyMode_DoesNotAuthorizeProposal()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var verified = new VerifiedPlanningContext(
            [new VerifiedPlanningItem("跑步", PlanningItemKind.Action, "我最近在考虑跑步")],
            [],
            UserTurnDisposition.NotApplicable,
            new EvidenceSummary(2, 2, []),
            new VerifiedActionRequest(ActionRequestKind.ActionMention, "我最近在考虑跑步"));

        // Act
        var authority = _calculator.Calculate(new PlanningAuthorityContext(
            Snapshot(mode), verified, mode.Policy.Planning));

        // Assert
        authority.CanGenerateProposal.Should().BeFalse(
            because: "the model may discuss an action without treating it as authorization to schedule");
    }

    [Fact]
    public void Handle_ExplicitPlanningRequestInClarifyMode_AuthorizesProposalCandidate()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var verified = new VerifiedPlanningContext(
            [new VerifiedPlanningItem("明早跑步", PlanningItemKind.Action, "帮我安排明早跑步")],
            [],
            UserTurnDisposition.NotApplicable,
            new EvidenceSummary(2, 2, []),
            new VerifiedActionRequest(ActionRequestKind.ExplicitPlanningRequest, "帮我安排明早跑步"));

        // Act
        var authority = _calculator.Calculate(new PlanningAuthorityContext(
            Snapshot(mode), verified, mode.Policy.Planning));

        // Assert
        authority.CanGenerateProposal.Should().BeTrue(
            because: "an explicit planning request is the Clarify-mode handoff into the shared proposal pipeline");
    }

    [Fact]
    public void Handle_ClarifySuggestionWithoutFurtherAuthority_RetainsVerifiedIntentMaterial()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var messageId = Guid.NewGuid();
        var verified = new VerifiedPlanningContext(
            [new VerifiedPlanningItem("改善睡眠", PlanningItemKind.Goal, "我想改善睡眠")],
            [],
            UserTurnDisposition.NotApplicable,
            new EvidenceSummary(1, 1, []));
        var authority = new PlanningAuthority(
            IsBlocked: false,
            Proposal: ProposalDisposition.Forbidden,
            Clarification: ClarificationDisposition.NotAllowed,
            ContextReadiness: PlanningContextReadiness.Insufficient,
            [PlanningAuthorityReason.ClarificationCanHelp],
            []);

        // Act
        var update = PlanningStateRules.BuildPlanningIntentUpdate(
            Snapshot(mode), verified, authority, messageId,
            proposalAccepted: false, AiCoachMode.Clarify);

        // Assert
        update.Should().NotBeNull(
            because: "a Clarify turn may summarize instead of asking while still retaining newly understood material");
        update!.Items.Should().ContainSingle(
            because: "the verified goal is the useful result of the clarification turn");
        update.Items[0].ItemId.Should().NotBeEmpty(
            because: "retained items need a server-owned identity for safe later references");
    }

    [Fact]
    public void Handle_CurrentEffectPlanningReference_VerifiesSelectedItem()
    {
        // Arrange
        var guard = new EvidenceGuard();
        var intentId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var interpretation = new InterpretationCandidate(
            IntentType.Goal,
            PlanningReferences:
            [
                new PlanningReferenceCandidate(
                    "planning_item_2",
                    PlanningReferenceKind.Selected,
                    new EvidenceReference("第二个")),
            ]);
        var context = new EvidenceVerificationContext(
            "第二个",
            new Dictionary<string, PlanningReferenceTarget>
            {
                ["planning_item_2"] = new(intentId, itemId),
            });

        // Act
        var verified = guard.Verify(interpretation, context);

        // Assert
        verified.References.Should().ContainSingle(
            because: "a current-message quote and a current-effect key form a valid historical reference");
        verified.References![0].ItemId.Should().Be(itemId,
            because: "the model-facing key must resolve to the server-owned item identity");
    }

    [Fact]
    public void Handle_UnknownPlanningReference_FailsClosed()
    {
        // Arrange
        var guard = new EvidenceGuard();
        var interpretation = new InterpretationCandidate(
            IntentType.Goal,
            PlanningReferences:
            [
                new PlanningReferenceCandidate(
                    "planning_item_99",
                    PlanningReferenceKind.Selected,
                    new EvidenceReference("第二个")),
            ]);

        // Act
        var verified = guard.Verify(
            interpretation,
            new EvidenceVerificationContext(
                "第二个",
                new Dictionary<string, PlanningReferenceTarget>()));

        // Assert
        verified.References.Should().BeEmpty(
            because: "the model cannot invent or reuse a planning reference outside the current effect");
        verified.Evidence.Issues.Should().Contain(EvidenceIssue.InvalidPlanningReference,
            because: "the invalid reference must remain observable and cannot mutate the intent");
    }

    [Fact]
    public void Handle_RecordClarificationAttempt_CountsQuestionsEvenWhenTopicsRepeat()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var now = DateTimeOffset.UtcNow;
        var intent = new ActivePlanningIntentSnapshot(
            Guid.NewGuid(), Guid.NewGuid(), [], [], PlanningIntentStatus.Collecting);
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Mode = AiCoachMode.Clarify,
            TimeZoneId = "Australia/Perth",
            RuntimeVersions = mode.ToRuntimeVersions(2),
            CreatedAt = now,
            ExpiresAt = now.AddHours(1),
        };
        var transition = StateTransition.MoveTo(
            ConversationPhase.ActionPreparing,
            GenerationStatus.Idle,
            new HashSet<ConversationAction> { ConversationAction.SendMessage },
            mutations:
            [
                new UpsertPlanningIntentMutation(intent),
                new RecordClarificationAttemptMutation(intent.IntentId, ClarificationTopic.Scope),
                new RecordClarificationAttemptMutation(intent.IntentId, ClarificationTopic.Scope),
            ]);

        // Act
        conversation.ApplyTransition(transition, now, TimeSpan.FromMinutes(1));

        // Assert
        conversation.ActivePlanningIntent!.ClarificationAttempts.Should().Be(2,
            because: "the ceiling counts actual questions rather than distinct topic labels");
        conversation.ActivePlanningIntent.AskedTopics.Should().ContainSingle(
            because: "topics remain compact context for the model even when a topic was revisited");
    }

    [Fact]
    public void Handle_ParseSchemaSixPlanningReference_PreservesReferenceAndInstructionTarget()
    {
        // Arrange
        const string json = """
        {
          "interpretation": {
            "intent": "concrete_action",
            "planningItems": [],
            "constraints": [],
            "planningReferences": [
              {
                "referenceKey": "planning_item_2",
                "kind": "selected",
                "evidence": { "quote": "第二个" }
              }
            ],
            "disposition": { "kind": "not_applicable", "evidence": null },
            "actionRequest": {
              "kind": "referenced_instruction",
              "evidence": { "quote": "安排第二个" },
              "referencedItemKey": "planning_item_2"
            },
            "supportRequest": { "kind": "unspecified", "evidence": null, "scope": "turn" }
          },
          "suggestedAction": "continue_listening",
          "response": {
            "type": "listening",
            "text": "我们可以继续理清。",
            "question": null,
            "questionTopic": null,
            "supportMove": null
          },
          "proposalSet": null,
          "proposalSetMutation": null
        }
        """;

        // Act
        var parsed = ModelTurnCandidateContract.Parse(json);

        // Assert
        parsed.IsSuccess.Should().BeTrue(
            because: "schema six must carry generic historical references without adding a Clarify-only contract");
        parsed.Candidate!.Interpretation.PlanningReferences.Should().ContainSingle(
            because: "the selected retained item is part of the model interpretation candidate");
        parsed.Candidate.Interpretation.ActionRequest!.ReferencedItemKey.Should().Be("planning_item_2",
            because: "a referenced action instruction must identify the retained item it acts on");
    }

    private static VerifiedPlanningContext EmptyVerified() => new(
        [], [], UserTurnDisposition.NotApplicable, new EvidenceSummary(0, 0, []));

    private static ConversationSnapshot Snapshot(
        AiCoachModeDefinition mode,
        ActivePlanningIntentSnapshot? intent = null) => new(
        Guid.NewGuid(),
        Guid.NewGuid(),
        mode.Mode,
        ConversationPhase.Conversing,
        GenerationStatus.Running,
        BlockedReason.None,
        Version: 1,
        CurrentProposalSet: null,
        OpenQuestion: null,
        new HashSet<ConversationFact>(),
        new HashSet<ConversationAction>(),
        mode.ToRuntimeVersions(protocolVersion: 2),
        intent);
}

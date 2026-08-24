using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Kernel;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

/// <summary>
/// Deterministic Kernel transition tests (v3 tech design §7.5 baseline table): pure
/// snapshot + event -> StateTransition, no store, no model.
/// </summary>
public class ConversationKernelTests
{
    private static readonly AiCoachModeDefinition Mode = ExecutionModeDefinition.Create();
    private static readonly Guid UserId = Guid.NewGuid();

    private readonly ConversationKernel _kernel = new();

    // ---------- Helpers ----------

    private static ConversationSnapshot Snapshot(
        ConversationPhase phase = ConversationPhase.Conversing,
        GenerationStatus generation = GenerationStatus.Idle,
        BlockedReason blocked = BlockedReason.None,
        ProposalSetSnapshot? set = null,
        OpenQuestionSnapshot? openQuestion = null,
        IReadOnlySet<ConversationAction>? actions = null) => new(
        Guid.NewGuid(),
        UserId,
        AiCoachMode.Execution,
        phase,
        generation,
        blocked,
        Version: 3,
        set,
        openQuestion,
        new HashSet<ConversationFact>(),
        actions ?? new HashSet<ConversationAction> { ConversationAction.SendMessage },
        Mode.ToRuntimeVersions(2));

    private static TaskProposal Proposal(string title = "整理资料") => new(
        Guid.NewGuid(), title, null,
        new DateOnly(2026, 8, 26), new TimeOnly(9, 0), new TimeOnly(9, 30),
        "Australia/Sydney", null);

    private static ProposalSetSnapshot PendingSet(params TaskProposal[] proposals) => new(
        Guid.NewGuid(), ProposalSet.SchemaVersion, ProposalSetStatus.Pending, Version: 1, proposals);

    private static ValidatedTurnOutcome Outcome(
        ConversationStrategy strategy,
        string text = "好的",
        string? question = null,
        IReadOnlyList<TaskProposal>? proposals = null) => new(
        strategy, StrategyDecisionType.Accepted, StrategyReasonCode.None,
        text, question, proposals, FallbackUsed: false);

    private static UserMessageReceived UserMessage() =>
        new(Guid.NewGuid(), "明天要上班", DateTimeOffset.UtcNow);

    // ---------- UserMessageReceived ----------

    [Fact]
    public void UserMessage_WhileGenerationRunning_IsRejectedAsTurnInProgress()
    {
        // Arrange
        var snapshot = Snapshot(generation: GenerationStatus.Running);

        // Act
        var transition = _kernel.Apply(snapshot, UserMessage(), Mode);

        // Assert
        transition.IsAccepted.Should().BeFalse(because: "only one running model effect per conversation is allowed (v3 §19)");
        transition.Rejection.Should().Be(TransitionRejection.TurnInProgress);
        transition.Rejection.ToWireCode().Should().Be("GenerationInProgress",
            because: "the unchanged schema-2 client switch-cases on the old error code string");
    }

    [Fact]
    public void UserMessage_WhileQuotaBlocked_IsRejected()
    {
        // Arrange
        var snapshot = Snapshot(generation: GenerationStatus.Blocked, blocked: BlockedReason.Quota);

        // Act
        var transition = _kernel.Apply(snapshot, UserMessage(), Mode);

        // Assert
        transition.IsAccepted.Should().BeFalse(because: "quota exhaustion is terminal for model calls this month");
        transition.Rejection.Should().Be(TransitionRejection.GenerationBlocked);
    }

    [Fact]
    public void UserMessage_FromFollowUp_StartsAFreshConversingRound()
    {
        // Arrange
        var snapshot = Snapshot(phase: ConversationPhase.FollowUp);

        // Act
        var transition = _kernel.Apply(snapshot, UserMessage(), Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue();
        transition.NextPhase.Should().Be(ConversationPhase.Conversing,
            because: "a handled card starts a fresh round (v3 §7.5 FollowUp -> Conversing)");
        transition.NextGenerationStatus.Should().Be(GenerationStatus.Running);
        transition.Effects.Should().ContainSingle(e => e is GenerateModelTurnEffectRequest,
            because: "every open user message costs exactly one model-turn effect");
        transition.AddFacts.Should().Contain(ConversationFact.HasRunningModelEffect);
        transition.AllowedActions.Should().BeEmpty(because: "nothing can be submitted while generating");
    }

    [Fact]
    public void UserMessage_OnClosedConversation_IsRejected()
    {
        // Arrange
        var snapshot = Snapshot(phase: ConversationPhase.Closed);

        // Act
        var transition = _kernel.Apply(snapshot, UserMessage(), Mode);

        // Assert
        transition.IsAccepted.Should().BeFalse();
        transition.Rejection.Should().Be(TransitionRejection.ConversationClosed);
    }

    // ---------- ModelTurnCompleted ----------

    [Fact]
    public void ModelTurn_WithSingleProposal_MovesToActionPending_WithStartNow()
    {
        // Arrange
        var snapshot = Snapshot(generation: GenerationStatus.Running);
        var outcome = Outcome(ConversationStrategy.ShowProposalSet,
            text: "建议 9:00 开始，精神最好。", proposals: [Proposal()]);

        // Act
        var transition = _kernel.Apply(
            snapshot, new ModelTurnCompleted(Guid.NewGuid(), 3, outcome), Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue();
        transition.NextPhase.Should().Be(ConversationPhase.ActionPending);
        transition.AddFacts.Should().Contain(ConversationFact.HasPendingProposalSet);
        transition.Mutations.Should().ContainSingle(m => m is CreateProposalSetMutation);
        transition.AllowedActions.Should().BeEquivalentTo(
            new[]
            {
                ConversationAction.SendMessage, ConversationAction.StartNow,
                ConversationAction.AddToTaskList, ConversationAction.RejectDraft,
            },
            because: "a single-task card offers start_now");
    }

    [Fact]
    public void ModelTurn_WithBatchProposals_OffersNoStartNow()
    {
        // Arrange
        var snapshot = Snapshot(generation: GenerationStatus.Running);
        var outcome = Outcome(ConversationStrategy.ShowProposalSet,
            proposals: [Proposal("上班"), Proposal("上学")]);

        // Act
        var transition = _kernel.Apply(
            snapshot, new ModelTurnCompleted(Guid.NewGuid(), 3, outcome), Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue();
        transition.AllowedActions.Should().NotContain(ConversationAction.StartNow,
            because: "a focus timer is for one task; batch cards save to the list");
        transition.AllowedActions.Should().Contain(ConversationAction.AddToTaskList);
    }

    [Fact]
    public void ModelTurn_ProposingOverAPendingCard_IsRejected()
    {
        // Arrange — defense in depth: guards should have blocked this already.
        var snapshot = Snapshot(
            phase: ConversationPhase.ActionPending,
            generation: GenerationStatus.Running,
            set: PendingSet(Proposal()));
        var outcome = Outcome(ConversationStrategy.ShowProposalSet, proposals: [Proposal("另一件事")]);

        // Act
        var transition = _kernel.Apply(
            snapshot, new ModelTurnCompleted(Guid.NewGuid(), 3, outcome), Mode);

        // Assert
        transition.IsAccepted.Should().BeFalse(
            because: "one open Current ProposalSet is a hard Kernel invariant (v3 §13.8)");
        transition.Rejection.Should().Be(TransitionRejection.PendingProposalSetAlreadyExists);
    }

    [Fact]
    public void ModelTurn_AskingAQuestion_MovesToActionPreparing_AndTracksTheQuestion()
    {
        // Arrange
        var snapshot = Snapshot(generation: GenerationStatus.Running);
        var outcome = Outcome(ConversationStrategy.AskClarifyingQuestion,
            text: "你想先做哪件具体的事？", question: "你想先做哪件具体的事？");

        // Act
        var transition = _kernel.Apply(
            snapshot, new ModelTurnCompleted(Guid.NewGuid(), 3, outcome), Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue();
        transition.NextPhase.Should().Be(ConversationPhase.ActionPreparing,
            because: "an open question means core information is being prepared (v3 §7.5)");
        transition.AddFacts.Should().Contain(ConversationFact.HasOpenQuestion);
        transition.Mutations.Should().ContainSingle(m => m is SetOpenQuestionMutation,
            because: "the open question is tracked so rounds are counted for the asked-twice rule");
    }

    [Fact]
    public void ModelTurn_PlainReplyWithCardOnScreen_LeavesTheCardUntouched()
    {
        // Arrange
        var set = PendingSet(Proposal());
        var snapshot = Snapshot(
            phase: ConversationPhase.ActionPending,
            generation: GenerationStatus.Running,
            set: set);
        var outcome = Outcome(ConversationStrategy.DiscussExistingProposal, text: "卡片可以直接编辑哦。");

        // Act
        var transition = _kernel.Apply(
            snapshot, new ModelTurnCompleted(Guid.NewGuid(), 3, outcome), Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue();
        transition.NextPhase.Should().Be(ConversationPhase.ActionPending);
        transition.Mutations.Should().AllSatisfy(m => m.Should().BeOfType<AppendAssistantMessageMutation>(),
            because: "a plain reply never mutates the pending card");
        transition.AllowedActions.Should().Contain(ConversationAction.StartNow,
            because: "the single-task card's actions are restored after the reply");
    }

    [Fact]
    public void ModelTurn_WhenGenerationIsNotRunning_IsRejectedAsStale()
    {
        // Arrange — a late result after the effect was already resolved (v3 §7.4).
        var snapshot = Snapshot(generation: GenerationStatus.Idle);
        var outcome = Outcome(ConversationStrategy.ContinueListening);

        // Act
        var transition = _kernel.Apply(
            snapshot, new ModelTurnCompleted(Guid.NewGuid(), 3, outcome), Mode);

        // Assert
        transition.IsAccepted.Should().BeFalse();
        transition.Rejection.Should().Be(TransitionRejection.StaleEffectResult);
    }

    // ---------- ModelTurnFailed ----------

    [Fact]
    public void ModelTurnFailed_Quota_BlocksGenerationAndDisablesAllActions()
    {
        // Arrange
        var snapshot = Snapshot(generation: GenerationStatus.Running);

        // Act
        var transition = _kernel.Apply(
            snapshot, new ModelTurnFailed(Guid.NewGuid(), 3, AiGenerationErrorCode.QuotaExceeded), Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue();
        transition.NextGenerationStatus.Should().Be(GenerationStatus.Blocked);
        transition.NextBlockedReason.Should().Be(BlockedReason.Quota);
        transition.AllowedActions.Should().BeEmpty(because: "quota exhaustion disables further submissions");
        transition.AddFacts.Should().Contain(ConversationFact.HasBlockedGeneration);
    }

    [Fact]
    public void ModelTurnFailed_Transient_ReturnsToIdleSoTheUserCanRetry()
    {
        // Arrange
        var snapshot = Snapshot(generation: GenerationStatus.Running);

        // Act
        var transition = _kernel.Apply(
            snapshot, new ModelTurnFailed(Guid.NewGuid(), 3, AiGenerationErrorCode.TimedOut), Mode);

        // Assert
        transition.NextGenerationStatus.Should().Be(GenerationStatus.Idle,
            because: "transient failures are retryable by sending again");
        transition.AllowedActions.Should().Contain(ConversationAction.SendMessage);
    }

    // ---------- Confirm / Reject ----------

    private static ConversationSnapshot ActionPendingSnapshot(
        ProposalSetSnapshot set) => Snapshot(
        phase: ConversationPhase.ActionPending,
        set: set,
        actions: new HashSet<ConversationAction>
        {
            ConversationAction.SendMessage,
            ConversationAction.StartNow,
            ConversationAction.AddToTaskList,
            ConversationAction.RejectDraft,
        });

    private static ValidatedProposalSet Validated(params TaskProposal[] proposals) => new(
        proposals,
        proposals.Select(p => new ValidatedProposalItem(
            p.ProposalId, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddMinutes(30))).ToList(),
        FocusMinutes: 15);

    [Fact]
    public void Confirm_HappyPath_MovesSetToProcessingAndRequestsPersistence()
    {
        // Arrange
        var proposal = Proposal();
        var set = PendingSet(proposal);
        var snapshot = ActionPendingSnapshot(set);

        // Act
        var transition = _kernel.Apply(snapshot, new ConfirmProposalSetRequested(
            Guid.NewGuid(), set.Id, ConversationAction.AddToTaskList, Validated(proposal)), Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue();
        transition.Mutations.OfType<UpdateProposalSetStatusMutation>().Should()
            .ContainSingle().Which.Status.Should().Be(ProposalSetStatus.Processing);
        transition.Effects.Should().ContainSingle(e => e is PersistProposalSetEffectRequest,
            because: "formal task creation is a deterministic effect, never a model call (v3 §18)");
        transition.AddFacts.Should().Contain(ConversationFact.HasProcessingProposalSet);
        transition.AllowedActions.Should().BeEmpty(because: "no actions while the confirmation is processing");
    }

    [Fact]
    public void Confirm_StartNowOnABatchCard_IsRejected()
    {
        // Arrange
        var p1 = Proposal("上班");
        var p2 = Proposal("上学");
        var set = PendingSet(p1, p2);
        var snapshot = ActionPendingSnapshot(set);

        // Act
        var transition = _kernel.Apply(snapshot, new ConfirmProposalSetRequested(
            Guid.NewGuid(), set.Id, ConversationAction.StartNow, Validated(p1, p2)), Mode);

        // Assert
        transition.IsAccepted.Should().BeFalse(because: "a focus timer is for exactly one task");
        transition.Rejection.Should().Be(TransitionRejection.ActionNotAllowed);
    }

    [Fact]
    public void Confirm_ForANonCurrentSet_IsRejectedAsStale()
    {
        // Arrange
        var proposal = Proposal();
        var snapshot = ActionPendingSnapshot(PendingSet(proposal));

        // Act — a different (old) set id.
        var transition = _kernel.Apply(snapshot, new ConfirmProposalSetRequested(
            Guid.NewGuid(), Guid.NewGuid(), ConversationAction.AddToTaskList, Validated(proposal)), Mode);

        // Assert
        transition.IsAccepted.Should().BeFalse();
        transition.Rejection.Should().Be(TransitionRejection.ProposalSetNotCurrent);
    }

    [Fact]
    public void Reject_MovesToFollowUpAndClearsTheSet()
    {
        // Arrange
        var set = PendingSet(Proposal());
        var snapshot = ActionPendingSnapshot(set);

        // Act
        var transition = _kernel.Apply(
            snapshot, new RejectProposalSetRequested(Guid.NewGuid(), set.Id), Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue();
        transition.NextPhase.Should().Be(ConversationPhase.FollowUp,
            because: "v3 §7.5: reject moves to FollowUp, not back to Conversing");
        transition.Mutations.Should().ContainSingle(m => m is ClearCurrentProposalSetMutation);
        transition.AddFacts.Should().Contain(ConversationFact.HasRejectedProposal);
        transition.AllowedActions.Should().BeEquivalentTo(new[] { ConversationAction.SendMessage });
    }

    // ---------- Persistence results ----------

    private static ProposalSetSnapshot ProcessingSet(params TaskProposal[] proposals) => new(
        Guid.NewGuid(), ProposalSet.SchemaVersion, ProposalSetStatus.Processing, Version: 2, proposals);

    [Fact]
    public void PersistenceSucceeded_CompletesTheSetAndMovesToFollowUp()
    {
        // Arrange
        var proposal = Proposal();
        var set = ProcessingSet(proposal);
        var snapshot = Snapshot(phase: ConversationPhase.ActionPending, set: set,
            actions: new HashSet<ConversationAction>());

        // Act
        var transition = _kernel.Apply(snapshot, new ProposalSetPersistenceSucceeded(
            Guid.NewGuid(), set.Id, [new PersistedProposal(proposal.ProposalId, 42)],
            ConversationAction.AddToTaskList, FocusMinutes: 15), Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue();
        transition.NextPhase.Should().Be(ConversationPhase.FollowUp);
        transition.Mutations.OfType<UpdateProposalSetStatusMutation>().Should()
            .ContainSingle().Which.Status.Should().Be(ProposalSetStatus.Completed);
        transition.Mutations.OfType<RecordPersistedTaskMutation>().Should()
            .ContainSingle().Which.PersistedTaskId.Should().Be(42);
        transition.AddFacts.Should().Contain(ConversationFact.HasAcceptedProposal);
    }

    [Fact]
    public void PersistenceFailed_RecoversToAnEditableCard_RecordingWhatWasSaved()
    {
        // Arrange — two tasks, first one was created before the failure.
        var p1 = Proposal("上班");
        var p2 = Proposal("上学");
        var set = ProcessingSet(p1, p2);
        var snapshot = Snapshot(phase: ConversationPhase.ActionPending, set: set,
            actions: new HashSet<ConversationAction>());

        // Act
        var transition = _kernel.Apply(snapshot, new ProposalSetPersistenceFailed(
            Guid.NewGuid(), set.Id, "TaskPersistenceFailed",
            [new PersistedProposal(p1.ProposalId, 41)]), Mode);

        // Assert
        transition.IsAccepted.Should().BeTrue();
        transition.NextPhase.Should().Be(ConversationPhase.ActionPending,
            because: "the card stays on screen for retry after a partial failure");
        transition.Mutations.OfType<RecordPersistedTaskMutation>().Should()
            .ContainSingle(because: "already-created tasks are recorded so the retry never duplicates them")
            .Which.PersistedTaskId.Should().Be(41);
        transition.Mutations.OfType<UpdateProposalSetStatusMutation>().Should()
            .ContainSingle().Which.Status.Should().Be(ProposalSetStatus.PartiallyFailed);
        transition.AddFacts.Should().Contain(ConversationFact.HasPendingProposalSet);
        transition.AllowedActions.Should().Contain(ConversationAction.AddToTaskList,
            because: "confirm is re-enabled for the retry");
    }

    // ---------- Aggregate integration: a full happy-path round ----------

    [Fact]
    public void FullRound_UserMessage_Proposal_Confirm_Persist_EndsInFollowUpWithCompletedSet()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        var lease = TimeSpan.FromMinutes(3);
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Mode = AiCoachMode.Execution,
            TimeZoneId = "Australia/Sydney",
            RuntimeVersions = Mode.ToRuntimeVersions(2),
            CreatedAt = now,
            ExpiresAt = now.AddHours(24),
        };

        // Act 1 — user message.
        var t1 = _kernel.Apply(conversation.ToSnapshot(), UserMessage(), Mode);
        var effects = conversation.ApplyTransition(t1, now, lease);
        effects.Should().ContainSingle(e => e.Request is GenerateModelTurnEffectRequest);

        // Act 2 — model turn proposes one task.
        var proposal = Proposal();
        var t2 = _kernel.Apply(conversation.ToSnapshot(), new ModelTurnCompleted(
            effects[0].Id, conversation.Version,
            Outcome(ConversationStrategy.ShowProposalSet, proposals: [proposal])), Mode);
        conversation.ApplyTransition(t2, now, lease);

        conversation.Phase.Should().Be(ConversationPhase.ActionPending);
        conversation.CurrentProposalSet.Should().NotBeNull();
        var setId = conversation.CurrentProposalSet!.Id;
        var storedProposal = conversation.CurrentProposalSet.Proposals.Single();

        // Act 3 — confirm.
        var t3 = _kernel.Apply(conversation.ToSnapshot(), new ConfirmProposalSetRequested(
            Guid.NewGuid(), setId, ConversationAction.AddToTaskList, Validated(storedProposal)), Mode);
        var persistEffects = conversation.ApplyTransition(t3, now, lease);
        persistEffects.Should().ContainSingle(e => e.Request is PersistProposalSetEffectRequest);

        // Act 4 — persistence succeeded.
        var t4 = _kernel.Apply(conversation.ToSnapshot(), new ProposalSetPersistenceSucceeded(
            persistEffects[0].Id, setId,
            [new PersistedProposal(storedProposal.ProposalId, 7)],
            ConversationAction.AddToTaskList, 15), Mode);
        conversation.ApplyTransition(t4, now, lease);

        // Assert
        conversation.Phase.Should().Be(ConversationPhase.FollowUp);
        conversation.CurrentProposalSet!.Status.Should().Be(ProposalSetStatus.Completed);
        conversation.CurrentProposalSet.Proposals.Single().PersistedTaskId.Should().Be(7,
            because: "the created formal task is recorded on the proposal");
        conversation.Facts.Should().Contain(ConversationFact.HasAcceptedProposal);
        conversation.Version.Should().Be(4, because: "each accepted transition bumps the version exactly once");
    }

    [Fact]
    public void OpenQuestionRounds_AccumulateAcrossClarifyingTurns()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        var lease = TimeSpan.FromMinutes(3);
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Mode = AiCoachMode.Execution,
            TimeZoneId = "Australia/Sydney",
            RuntimeVersions = Mode.ToRuntimeVersions(2),
            CreatedAt = now,
            ExpiresAt = now.AddHours(24),
        };

        // Act — two question rounds.
        foreach (var question in new[] { "你想先做哪件具体的事？", "第一步想从哪里开始？" })
        {
            var send = _kernel.Apply(conversation.ToSnapshot(), UserMessage(), Mode);
            var effects = conversation.ApplyTransition(send, now, lease);
            var reply = _kernel.Apply(conversation.ToSnapshot(), new ModelTurnCompleted(
                effects[0].Id, conversation.Version,
                Outcome(ConversationStrategy.AskClarifyingQuestion, text: question, question: question)), Mode);
            conversation.ApplyTransition(reply, now, lease);
        }

        // Assert
        conversation.Phase.Should().Be(ConversationPhase.ActionPreparing);
        conversation.OpenQuestion.Should().NotBeNull();
        conversation.OpenQuestion!.RoundsAsked.Should().Be(2,
            because: "the asked-twice rule needs the round count to survive across turns");
    }
}

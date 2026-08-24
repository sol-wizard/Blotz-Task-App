using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Rules;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

/// <summary>
/// Pure state-machine tests (tech design §26: Given mode+state+artifact, When event, Then next
/// state + effects + allowed actions). No model, no store, no database — these encode the
/// acceptance scenarios of the AI Coach brief at the reducer level.
/// </summary>
public class ConversationReducerTests
{
    private static readonly AiCoachModeDefinition Mode = ExecutionModeDefinition.Create();
    private readonly ConversationReducer _reducer = new();

    private static TaskDraftItem Item(string title, int hour = 15, int? persistedTaskId = null) => new(
        Guid.NewGuid(), title, null, new DateOnly(2026, 8, 17),
        new TimeOnly(hour, 0), new TimeOnly(hour, 30), "Australia/Sydney", null, persistedTaskId);

    /// <summary>A single-task card.</summary>
    private static readonly TaskDraftPayload SampleDraft = new([Item("整理三篇参考资料")]);

    /// <summary>A multi-task card ("明天上班，后天上学" style, product decision 2026-08-22).</summary>
    private static readonly TaskDraftPayload BatchDraft = new([Item("写周报", 9), Item("订机票", 11), Item("打电话给牙医", 14)]);

    private static ValidatedTaskDraft Validated(TaskDraftPayload payload, int focusMinutes = 15) => new(
        payload,
        payload.Items.Select(i => new ValidatedTaskDraftItem(
            i.ItemId, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddMinutes(30))).ToList(),
        focusMinutes);

    private static IReadOnlyList<PersistedDraftItem> Persisted(TaskDraftPayload payload, int fromTaskId = 100) =>
        payload.Items.Select((i, index) => new PersistedDraftItem(i.ItemId, fromTaskId + index)).ToList();

    private static ConversationSnapshot Snapshot(
        ConversationState state,
        GenerationStatus generation = GenerationStatus.Idle,
        BlockedReason blockedReason = BlockedReason.None,
        CurrentArtifactSnapshot? artifact = null,
        int clarificationRounds = 0,
        IReadOnlySet<ConversationAction>? allowedActions = null)
    {
        return new ConversationSnapshot(
            ConversationId: Guid.NewGuid(),
            UserId: Guid.NewGuid(),
            Mode: AiCoachMode.Execution,
            LifecycleStatus: ConversationLifecycleStatus.Active,
            State: state,
            GenerationStatus: generation,
            BlockedReason: blockedReason,
            Version: 3,
            CurrentArtifact: artifact,
            Clarification: new ClarificationProgress(clarificationRounds),
            AllowedActions: allowedActions ?? new HashSet<ConversationAction>
            {
                ConversationAction.SendMessage,
            });
    }

    private static CurrentArtifactSnapshot PendingDraftArtifact(Guid? id = null, TaskDraftPayload? payload = null) => new(
        id ?? Guid.NewGuid(), ArtifactType.TaskDraft, 2, 1, ArtifactStatus.Pending, payload ?? SampleDraft);

    private static UserMessageReceived Message(string content) =>
        new(Guid.NewGuid(), content, DateTimeOffset.UtcNow);

    // ---------- Sending messages ----------

    [Fact]
    public void UserMessage_WhileIdle_StartsGenerationEffect()
    {
        var result = _reducer.Reduce(Snapshot(ConversationState.Conversing), Message("我要写论文"), Mode);

        result.IsAccepted.Should().BeTrue();
        result.NextGenerationStatus.Should().Be(GenerationStatus.Running);
        result.Effects.Should().ContainSingle(e => e is GenerateModelTurnEffectRequest);
        result.AllowedActions.Should().BeEmpty("input is disabled while the model runs");
    }

    [Fact]
    public void UserMessage_WhileGenerating_IsRejected()
    {
        var snapshot = Snapshot(ConversationState.Conversing, GenerationStatus.Running);

        var result = _reducer.Reduce(snapshot, Message("second message"), Mode);

        result.IsAccepted.Should().BeFalse();
        result.Violation.Should().Be(RuleViolation.GenerationInProgress);
    }

    [Fact]
    public void UserMessage_WhenQuotaBlocked_IsRejected()
    {
        var snapshot = Snapshot(ConversationState.Conversing, GenerationStatus.Blocked, BlockedReason.Quota);

        var result = _reducer.Reduce(snapshot, Message("hello"), Mode);

        result.IsAccepted.Should().BeFalse();
        result.Violation.Should().Be(RuleViolation.GenerationBlocked);
    }

    // ---------- Scenario 1: vague input -> clarification, no draft ----------

    [Fact]
    public void ModelTurn_WithoutDraft_MovesToClarifying_AndCountsTheRound()
    {
        var snapshot = Snapshot(ConversationState.Conversing, GenerationStatus.Running);

        var result = _reducer.Reduce(snapshot,
            new ModelTurnCompleted(Guid.NewGuid(), 3, "你准备先处理论文的哪一部分？", null), Mode);

        result.IsAccepted.Should().BeTrue();
        result.NextState.Should().Be(ConversationState.Clarifying);
        result.NextGenerationStatus.Should().Be(GenerationStatus.Idle);
        result.Mutations.Should().ContainSingle(m => m is IncrementClarificationRoundMutation);
        result.AllowedActions.Should().BeEquivalentTo(new[] { ConversationAction.SendMessage });
    }

    // ---------- Scenario 2: concrete answer -> exactly one draft with the draft actions ----------

    [Fact]
    public void ModelTurn_WithDraft_MovesToDraftPending_WithTheDraftActions()
    {
        var snapshot = Snapshot(ConversationState.Clarifying, GenerationStatus.Running, clarificationRounds: 1);

        var result = _reducer.Reduce(snapshot,
            new ModelTurnCompleted(Guid.NewGuid(), 3, "今天下午 3 点开始，先安排 30 分钟怎么样？", SampleDraft), Mode);

        result.IsAccepted.Should().BeTrue();
        result.NextState.Should().Be(ConversationState.DraftPending);
        result.Mutations.Should().ContainSingle(m => m is CreateCurrentArtifactMutation);
        result.AllowedActions.Should().Contain(
        [
            ConversationAction.StartNow,
            ConversationAction.AddToTaskList,
            ConversationAction.RejectDraft,
        ]);
    }

    // ---------- Scenario 2b: several things at once -> ONE card with N tasks, no "start now" ----------

    [Fact]
    public void ModelTurn_WithBatchDraft_CreatesOneCard_WithoutStartNow()
    {
        var snapshot = Snapshot(ConversationState.Conversing, GenerationStatus.Running);

        var result = _reducer.Reduce(snapshot,
            new ModelTurnCompleted(Guid.NewGuid(), 3, "三件事都排好了，看看卡片。", BatchDraft), Mode);

        result.IsAccepted.Should().BeTrue();
        result.NextState.Should().Be(ConversationState.DraftPending);
        result.Mutations.Should().ContainSingle(m => m is CreateCurrentArtifactMutation,
            "N tasks still mean ONE current artifact (§21.5)");
        ((CreateCurrentArtifactMutation)result.Mutations.Single(m => m is CreateCurrentArtifactMutation))
            .Payload.Should().BeOfType<TaskDraftPayload>().Which.Items.Should().HaveCount(3);
        result.AllowedActions.Should().Contain([ConversationAction.AddToTaskList, ConversationAction.RejectDraft]);
        result.AllowedActions.Should().NotContain(ConversationAction.StartNow,
            "a focus timer is for one task; a multi-task card only offers add-to-list");
    }

    [Fact]
    public void ModelTurn_WithoutDraft_WhileBatchDraftPending_KeepsBatchActions()
    {
        var snapshot = Snapshot(
            ConversationState.DraftPending, GenerationStatus.Running,
            artifact: PendingDraftArtifact(payload: BatchDraft));

        var result = _reducer.Reduce(snapshot,
            new ModelTurnCompleted(Guid.NewGuid(), 3, "先处理当前这张卡片吧", null), Mode);

        result.IsAccepted.Should().BeTrue();
        result.AllowedActions.Should().Contain(ConversationAction.AddToTaskList);
        result.AllowedActions.Should().NotContain(ConversationAction.StartNow);
    }

    // ---------- Scenario 3: second draft while one is pending ----------

    [Fact]
    public void ModelTurn_ProposingDraft_WhileDraftPending_IsRejected()
    {
        var snapshot = Snapshot(
            ConversationState.DraftPending, GenerationStatus.Running, artifact: PendingDraftArtifact());

        var result = _reducer.Reduce(snapshot,
            new ModelTurnCompleted(Guid.NewGuid(), 3, "好的", SampleDraft), Mode);

        result.IsAccepted.Should().BeFalse();
        result.Violation.Should().Be(RuleViolation.StaleArtifact);
    }

    [Fact]
    public void ModelTurn_WithoutDraft_WhileDraftPending_KeepsTheCurrentDraft()
    {
        var snapshot = Snapshot(
            ConversationState.DraftPending, GenerationStatus.Running, artifact: PendingDraftArtifact());

        var result = _reducer.Reduce(snapshot,
            new ModelTurnCompleted(Guid.NewGuid(), 3, "先处理当前这张卡片吧", null), Mode);

        result.IsAccepted.Should().BeTrue();
        result.NextState.Should().Be(ConversationState.DraftPending);
        result.Mutations.Should().AllSatisfy(m => m.Should().BeOfType<AppendAssistantMessageMutation>());
        result.AllowedActions.Should().Contain(ConversationAction.StartNow);
    }

    // ---------- Stale model results ----------

    [Fact]
    public void ModelTurn_WhenNoGenerationRunning_IsRejectedAsStale()
    {
        var snapshot = Snapshot(ConversationState.Conversing, GenerationStatus.Idle);

        var result = _reducer.Reduce(snapshot,
            new ModelTurnCompleted(Guid.NewGuid(), 3, "late reply", null), Mode);

        result.IsAccepted.Should().BeFalse();
        result.Violation.Should().Be(RuleViolation.StaleEffectResult);
    }

    // ---------- Generation failures ----------

    [Theory]
    [InlineData(AiGenerationErrorCode.QuotaExceeded, GenerationStatus.Blocked, BlockedReason.Quota)]
    [InlineData(AiGenerationErrorCode.ContentFiltered, GenerationStatus.Blocked, BlockedReason.ContentFiltered)]
    [InlineData(AiGenerationErrorCode.ModelUnavailable, GenerationStatus.Blocked, BlockedReason.ModelUnavailable)]
    [InlineData(AiGenerationErrorCode.TimedOut, GenerationStatus.Idle, BlockedReason.None)]
    public void GenerationFailure_SetsOrthogonalStatus_NeverAFakeState(
        AiGenerationErrorCode errorCode, GenerationStatus expectedStatus, BlockedReason expectedReason)
    {
        var snapshot = Snapshot(ConversationState.Clarifying, GenerationStatus.Running);

        var result = _reducer.Reduce(snapshot,
            new ModelGenerationFailed(Guid.NewGuid(), 3, errorCode), Mode);

        result.IsAccepted.Should().BeTrue();
        result.NextState.Should().Be(ConversationState.Clarifying, "the interaction phase must not change");
        result.NextGenerationStatus.Should().Be(expectedStatus);
        result.NextBlockedReason.Should().Be(expectedReason);
    }

    [Fact]
    public void QuotaFailure_DisablesAllActions()
    {
        var snapshot = Snapshot(ConversationState.Conversing, GenerationStatus.Running);

        var result = _reducer.Reduce(snapshot,
            new ModelGenerationFailed(Guid.NewGuid(), 3, AiGenerationErrorCode.QuotaExceeded), Mode);

        result.AllowedActions.Should().BeEmpty();
    }

    // ---------- Draft confirmation ----------

    [Fact]
    public void Confirm_MovesArtifactToProcessing_AndRequestsPersistEffect()
    {
        var artifact = PendingDraftArtifact();
        var snapshot = Snapshot(ConversationState.DraftPending, artifact: artifact,
            allowedActions: new HashSet<ConversationAction>
            {
                ConversationAction.SendMessage,
                ConversationAction.StartNow,
                ConversationAction.AddToTaskList,
                ConversationAction.RejectDraft,
            });
        var validated = Validated(SampleDraft);

        var result = _reducer.Reduce(snapshot,
            new ConfirmTaskDraftRequested(Guid.NewGuid(), artifact.Id, ConversationAction.StartNow, validated), Mode);

        result.IsAccepted.Should().BeTrue();
        result.NextState.Should().Be(ConversationState.DraftPending, "DraftHandled only comes after persistence");
        result.Mutations.Should().Contain(m =>
            m is UpdateCurrentArtifactStatusMutation
            && ((UpdateCurrentArtifactStatusMutation)m).Status == ArtifactStatus.Processing);
        result.Effects.Should().ContainSingle(e => e is PersistDraftEffectRequest);
        result.AllowedActions.Should().BeEmpty("no double confirmation while persisting");
    }

    [Fact]
    public void Confirm_WithStaleArtifactId_IsRejected()
    {
        var snapshot = Snapshot(ConversationState.DraftPending, artifact: PendingDraftArtifact());
        var validated = Validated(SampleDraft);

        var result = _reducer.Reduce(snapshot,
            new ConfirmTaskDraftRequested(Guid.NewGuid(), Guid.NewGuid(), ConversationAction.StartNow, validated),
            Mode);

        result.IsAccepted.Should().BeFalse();
        result.Violation.Should().Be(RuleViolation.StaleArtifact);
    }

    [Fact]
    public void Confirm_WithActionNotInAllowedActions_IsRejected()
    {
        var artifact = PendingDraftArtifact();
        var snapshot = Snapshot(ConversationState.DraftPending, artifact: artifact,
            allowedActions: new HashSet<ConversationAction> { ConversationAction.SendMessage });
        var validated = Validated(SampleDraft);

        var result = _reducer.Reduce(snapshot,
            new ConfirmTaskDraftRequested(Guid.NewGuid(), artifact.Id, ConversationAction.StartNow, validated), Mode);

        result.IsAccepted.Should().BeFalse();
        result.Violation.Should().Be(RuleViolation.ActionNotAllowed);
    }

    [Fact]
    public void Confirm_StartNow_WithSeveralTasks_IsRejected()
    {
        // Even if a stale client still shows the button: one focus timer, one task.
        var artifact = PendingDraftArtifact(payload: BatchDraft);
        var snapshot = Snapshot(ConversationState.DraftPending, artifact: artifact,
            allowedActions: new HashSet<ConversationAction>
            {
                ConversationAction.SendMessage,
                ConversationAction.StartNow,
                ConversationAction.AddToTaskList,
                ConversationAction.RejectDraft,
            });

        var result = _reducer.Reduce(snapshot,
            new ConfirmTaskDraftRequested(Guid.NewGuid(), artifact.Id, ConversationAction.StartNow, Validated(BatchDraft)),
            Mode);

        result.IsAccepted.Should().BeFalse();
        result.Violation.Should().Be(RuleViolation.ActionNotAllowed);
    }

    [Fact]
    public void Confirm_AddToTaskList_WithSeveralTasks_RequestsOnePersistEffect()
    {
        var artifact = PendingDraftArtifact(payload: BatchDraft);
        var snapshot = Snapshot(ConversationState.DraftPending, artifact: artifact,
            allowedActions: new HashSet<ConversationAction>
            {
                ConversationAction.SendMessage,
                ConversationAction.AddToTaskList,
                ConversationAction.RejectDraft,
            });

        var result = _reducer.Reduce(snapshot,
            new ConfirmTaskDraftRequested(Guid.NewGuid(), artifact.Id, ConversationAction.AddToTaskList, Validated(BatchDraft)),
            Mode);

        result.IsAccepted.Should().BeTrue();
        result.Effects.Should().ContainSingle(e => e is PersistDraftEffectRequest,
            "one effect persists the whole card; the handler loops over the items");
    }

    // ---------- Persistence results (§19.4) ----------

    [Fact]
    public void PersistenceSuccess_MovesToDraftHandled_AndAcceptsArtifact()
    {
        var artifact = new CurrentArtifactSnapshot(
            Guid.NewGuid(), ArtifactType.TaskDraft, 2, 2, ArtifactStatus.Processing, SampleDraft);
        var snapshot = Snapshot(ConversationState.DraftPending, artifact: artifact);

        var result = _reducer.Reduce(snapshot,
            new DraftPersistenceSucceeded(Guid.NewGuid(), artifact.Id, Persisted(SampleDraft), ConversationAction.StartNow, 15), Mode);

        result.IsAccepted.Should().BeTrue();
        result.NextState.Should().Be(ConversationState.DraftHandled);
        result.Mutations.Should().Contain(m =>
            m is UpdateCurrentArtifactStatusMutation
            && ((UpdateCurrentArtifactStatusMutation)m).Status == ArtifactStatus.Accepted);
    }

    [Fact]
    public void PersistenceSuccess_ForBatch_RecordsEveryTaskId()
    {
        var artifact = new CurrentArtifactSnapshot(
            Guid.NewGuid(), ArtifactType.TaskDraft, 2, 2, ArtifactStatus.Processing, BatchDraft);
        var snapshot = Snapshot(ConversationState.DraftPending, artifact: artifact);

        var result = _reducer.Reduce(snapshot,
            new DraftPersistenceSucceeded(Guid.NewGuid(), artifact.Id, Persisted(BatchDraft), ConversationAction.AddToTaskList, 0), Mode);

        result.IsAccepted.Should().BeTrue();
        result.Mutations.OfType<RecordPersistedTaskMutation>().Should().HaveCount(3);
        result.Events.Should().ContainSingle(e => e is DraftPersisted && ((DraftPersisted)e).TaskIds.Count == 3);
    }

    [Fact]
    public void PersistenceFailure_MidBatch_RecordsTheCreatedOnes_AndRecoversToPending()
    {
        // Items 1 and 2 were created, item 3 failed: the card stays, the two task ids are kept so
        // a retry only creates the third (no duplicates). Partial-failure UX policy is separate.
        var artifact = new CurrentArtifactSnapshot(
            Guid.NewGuid(), ArtifactType.TaskDraft, 2, 2, ArtifactStatus.Processing, BatchDraft);
        var snapshot = Snapshot(ConversationState.DraftPending, artifact: artifact);
        var partial = Persisted(BatchDraft).Take(2).ToList();

        var result = _reducer.Reduce(snapshot,
            new DraftPersistenceFailed(Guid.NewGuid(), artifact.Id, "TaskPersistenceFailed", partial), Mode);

        result.IsAccepted.Should().BeTrue();
        result.NextState.Should().Be(ConversationState.DraftPending);
        result.Mutations.OfType<RecordPersistedTaskMutation>().Should().HaveCount(2);
        result.Mutations.Should().Contain(m =>
            m is UpdateCurrentArtifactStatusMutation
            && ((UpdateCurrentArtifactStatusMutation)m).Status == ArtifactStatus.Pending);
        result.AllowedActions.Should().Contain(ConversationAction.AddToTaskList, "the user must be able to retry");
        result.AllowedActions.Should().NotContain(ConversationAction.StartNow);
    }

    [Fact]
    public void PersistenceFailure_RecoversDraftToPending_WithRetryActions()
    {
        var artifact = new CurrentArtifactSnapshot(
            Guid.NewGuid(), ArtifactType.TaskDraft, 2, 2, ArtifactStatus.Processing, SampleDraft);
        var snapshot = Snapshot(ConversationState.DraftPending, artifact: artifact);

        var result = _reducer.Reduce(snapshot,
            new DraftPersistenceFailed(Guid.NewGuid(), artifact.Id, "TaskPersistenceFailed"), Mode);

        result.IsAccepted.Should().BeTrue();
        result.NextState.Should().Be(ConversationState.DraftPending);
        result.Mutations.Should().Contain(m =>
            m is UpdateCurrentArtifactStatusMutation
            && ((UpdateCurrentArtifactStatusMutation)m).Status == ArtifactStatus.Pending);
        result.AllowedActions.Should().Contain(ConversationAction.StartNow, "the user must be able to retry");
    }

    // ---------- Rejection ----------

    [Fact]
    public void Reject_ClearsArtifact_AndReturnsToConversing()
    {
        var artifact = PendingDraftArtifact();
        var snapshot = Snapshot(ConversationState.DraftPending, artifact: artifact);

        var result = _reducer.Reduce(snapshot,
            new RejectTaskDraftRequested(Guid.NewGuid(), artifact.Id), Mode);

        result.IsAccepted.Should().BeTrue();
        result.NextState.Should().Be(ConversationState.Conversing);
        result.Mutations.Should().Contain(m => m is ClearCurrentArtifactMutation);
        result.Events.Should().ContainSingle(e => e is DraftRejected);
    }
}

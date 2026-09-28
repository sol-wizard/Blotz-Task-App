using System.Text.Json;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;

namespace BlotzTask.Tests.AiCoach;

public sealed class DraftWorkflowTests(DatabaseFixture fixture) : IClassFixture<DatabaseFixture>
{
    [Fact]
    public void Handle_LaterInvalidOperation_LeavesEntireDraftUnchanged()
    {
        // Arrange
        var draft = Draft();
        var tools = new DraftTools([draft], "Australia/Perth");
        var request = new { draftId = draft.Id, changes = new object[]
        {
            new { operation = "update", itemId = draft.Proposals[0].ProposalId, fields = new { title = "Changed" } },
            new { operation = "remove", itemId = Guid.NewGuid() },
        }};
        // Act
        var result = Call(tools, "update_draft", request);
        // Assert
        result.GetProperty("success").GetBoolean().Should().BeFalse(because: "an invalid item must reject the entire update");
        tools.Drafts[0].Proposals[0].Title.Should().Be("Read", because: "an earlier valid operation cannot leak from a failed batch");
        tools.Drafts[0].Version.Should().Be(draft.Version, because: "a failed operation cannot advance the draft version");
    }

    [Fact]
    public void Handle_MultipleUnscheduledDrafts_PreservesBothWithoutTaskWrites()
    {
        // Arrange
        var tools = new DraftTools([], "Australia/Perth");
        // Act
        Call(tools, "create_draft", new { items = new[] { new { title = "Read" } } });
        Call(tools, "create_draft", new { items = new[] { new { title = "Walk" } } });
        // Assert
        tools.Drafts.Should().HaveCount(2, because: "an existing draft must not block another topic");
        tools.Drafts.SelectMany(draft => draft.Proposals).Should().OnlyContain(item => item.Date == null && item.PersistedTaskId == null,
            because: "the tool need not invent a schedule or save a formal task");
    }

    [Fact]
    public void Handle_UpdateOneField_PreservesOtherFieldsAndOriginalSnapshot()
    {
        // Arrange
        var draft = Draft();
        var tools = new DraftTools([draft], "Australia/Perth");
        // Act
        var result = Call(tools, "update_draft", new { draftId = draft.Id, changes = new[]
        { new { operation = "update", itemId = draft.Proposals[0].ProposalId, fields = new { date = "2026-10-05" } } } });
        // Assert
        result.GetProperty("success").GetBoolean().Should().BeTrue(because: "the change is valid");
        tools.Drafts[0].Proposals[0].StartTime.Should().Be(new TimeOnly(9, 0), because: "omitted fields must stay unchanged");
        draft.Proposals[0].Date.Should().Be(new DateOnly(2026, 10, 1), because: "model work is isolated until the turn commits");
    }

    [Fact]
    public void Handle_SavedItemMutation_RejectsWithoutDeletingFormalTask()
    {
        // Arrange
        var draft = Draft();
        draft.StartSaving();
        draft.RecordSaved(draft.Proposals[0].ProposalId, 123);
        draft.FinishSaving(null);
        var tools = new DraftTools([draft], "Australia/Perth");
        // Act
        var result = Call(tools, "update_draft", new { draftId = draft.Id, changes = new[]
        { new { operation = "remove", itemId = draft.Proposals[0].ProposalId } } });
        // Assert
        result.GetProperty("success").GetBoolean().Should().BeFalse(because: "draft tools cannot delete saved tasks");
        tools.Drafts[0].Proposals[0].PersistedTaskId.Should().Be(123, because: "the saved association remains authoritative");
    }

    [Fact]
    public async Task Handle_ConcurrentEdits_OnlyOneVersionWins()
    {
        // Arrange
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var store = new InMemoryConversationStore(cache);
        var conversation = await Session(store);
        var draft = conversation.Drafts[0];
        var handler = new EditDraftCommandHandler(store);
        var request = new EditDraftRequest(conversation.Version, draft.Version, Edited(draft));
        // Act
        var results = await Task.WhenAll(Enumerable.Range(0, 2).Select(async _ =>
        {
            try { await handler.Handle(conversation.UserId, conversation.Id, draft.Id, request, default); return true; }
            catch (ConversationVersionConflictException) { return false; }
        }));
        // Assert
        results.Count(success => success).Should().Be(1, because: "both clients read the same version and only one may commit");
        conversation.History.Should().HaveCount(1, because: "only the committed edit should enter model context");
    }

    [Fact]
    public async Task Handle_ConfirmReplay_CreatesTasksExactlyOnce()
    {
        // Arrange
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var store = new InMemoryConversationStore(cache);
        var conversation = await Session(store);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var handler = Confirm(store, db);
        var command = Command(conversation);
        // Act
        var first = await handler.Handle(command);
        var replay = await handler.Handle(command);
        // Assert
        first.Status.Should().Be("succeeded", because: "valid reviewed data can become a task");
        replay.PersistedEntities.Select(item => item.Id).Should().Equal(first.PersistedEntities.Select(item => item.Id), because: "replay returns the original task identities");
        (await db.TaskItems.CountAsync(item => item.UserId == conversation.UserId)).Should().Be(1, because: "a lost response must not cause a duplicate task");
    }

    [Fact]
    public async Task Handle_CommandIdReusedWithChangedDescription_Rejects()
    {
        // Arrange
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var store = new InMemoryConversationStore(cache);
        var conversation = await Session(store);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var handler = Confirm(store, db);
        var command = Command(conversation);
        await handler.Handle(command);
        var changed = Command(conversation, command.Request.CommandId, description: "Different description");
        // Act
        var action = () => handler.Handle(changed);
        // Assert
        (await action.Should().ThrowAsync<DraftConflictException>(because: "the idempotency hash must include descriptions too"))
            .Which.ErrorCode.Should().Be("IdempotencyKeyReused", because: "different data cannot reuse a completed command ID");
    }

    [Fact]
    public async Task Handle_SecondTaskFails_RollsBackBatchAndCanRetry()
    {
        // Arrange
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var store = new InMemoryConversationStore(cache);
        var conversation = await Session(store);
        var draft = conversation.Drafts[0];
        draft.Replace([draft.Proposals[0], draft.Proposals[0] with { ProposalId = Guid.NewGuid(), Title = "Invalid label", LabelId = int.MaxValue }]);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var handler = Confirm(store, db);
        // Act
        var failed = await handler.Handle(Command(conversation));
        var countAfterFailure = await db.TaskItems.CountAsync(item => item.UserId == conversation.UserId);
        // Correct the failed data through the real draft tool, removing the unsaved invalid item.
        var tools = new DraftTools(conversation.Drafts, conversation.TimeZoneId);
        Call(tools, "update_draft", new { draftId = draft.Id, changes = new[] { new { operation = "remove", itemId = draft.Proposals[1].ProposalId } } });
        draft.Replace(tools.Drafts[0].Proposals);
        var retried = await handler.Handle(Command(conversation));
        // Assert
        failed.Status.Should().Be("failed", because: "the database rejects the invalid foreign key");
        countAfterFailure.Should().Be(0, because: "the first task belongs to the same transaction as the failing second task");
        retried.Status.Should().Be("succeeded", because: "failed drafts stay editable and retryable");
        (await db.TaskItems.CountAsync(item => item.UserId == conversation.UserId)).Should().Be(1, because: "retry must not duplicate a rolled-back task");
    }

    [Fact]
    public async Task Handle_MissingSchedule_LeavesDraftEditableWithoutReceipt()
    {
        // Arrange
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var store = new InMemoryConversationStore(cache);
        var conversation = await Session(store);
        var draft = conversation.Drafts[0];
        draft.Replace([draft.Proposals[0] with { Date = null, StartTime = null, EndTime = null }]);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var command = Command(conversation);
        // Act
        var action = () => Confirm(store, db).Handle(command);
        // Assert
        (await action.Should().ThrowAsync<DraftFieldValidationException>(because: "formal tasks require a schedule"))
            .Which.ErrorCode.Should().Be("ScheduleRequired", because: "the client should know what needs completing");
        conversation.Receipts.Should().BeEmpty(because: "field validation is before command acceptance");
        draft.Status.Should().Be(ProposalSetStatus.Pending, because: "validation must not strand the draft in processing");
    }

    [Fact]
    public async Task Handle_ForeignConversation_RejectsBeforeMutation()
    {
        // Arrange
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var store = new InMemoryConversationStore(cache);
        var conversation = await Session(store);
        var draft = conversation.Drafts[0];
        var handler = new EditDraftCommandHandler(store);
        // Act
        var action = () => handler.Handle(Guid.NewGuid(), conversation.Id, draft.Id,
            new(conversation.Version, draft.Version, Edited(draft)), default);
        // Assert
        await action.Should().ThrowAsync<ConversationNotFoundException>(because: "knowledge of a draft ID never grants access");
    }

    [Fact]
    public async Task Handle_StaleTurn_DiscardsReplyAndDraftsAndReleasesSession()
    {
        // Arrange
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var conversation = await Session(new InMemoryConversationStore(cache));
        var messageId = Guid.NewGuid();
        conversation.BeginTurn(messageId, "Create a draft");
        var expected = conversation.Version;
        var original = conversation.Drafts[0].Id;
        conversation.Touch();
        // Act
        var result = conversation.CompleteTurn(messageId, expected, "Done", null, [], [Draft()], null, 0);
        // Assert
        result.Should().Be(TurnCommitStatus.Stale, because: "a result from an older version cannot overwrite current data");
        conversation.Drafts[0].Id.Should().Be(original, because: "the stale workspace must not replace the current draft");
        conversation.Messages.Should().NotContain(message => message.Role == ConversationMessageRole.Assistant,
            because: "a stale success claim must not be displayed");
        OperationPolicy.CanStartOperation(conversation).Should().BeTrue(because: "discarding an active stale result must release the session");
    }

    [Fact]
    public async Task Handle_CancelledTurnAndLateResult_CannotCommitOrClearNewTurn()
    {
        // Arrange
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var conversation = await Session(new InMemoryConversationStore(cache));
        var first = Guid.NewGuid();
        conversation.BeginTurn(first, "Help me");
        var version = conversation.Version;
        // Act
        var cancelled = conversation.CompleteTurn(first, version, "Uncommitted", "cancelled", [], [Draft()], null, 0);
        var next = Guid.NewGuid();
        conversation.BeginTurn(next, "Try another way");
        var late = conversation.CompleteTurn(first, version, "Late reply", null, [], [], null, 0);
        // Assert
        cancelled.Should().Be(TurnCommitStatus.Failed, because: "a cancelled request must not commit a successful reply");
        late.Should().Be(TurnCommitStatus.NoLongerActive, because: "the previous request no longer owns the session");
        conversation.RunningTurnId.Should().Be(next, because: "late completion must never clear a newer running request");
        conversation.CompletedMessages.Should().NotContain(first, because: "cancelled turns remain unsuccessful");
    }

    [Fact]
    public async Task Handle_CompletedTurnReplay_DoesNotAppendAgain()
    {
        // Arrange
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var conversation = await Session(new InMemoryConversationStore(cache));
        var id = Guid.NewGuid();
        conversation.BeginTurn(id, "Hello");
        var version = conversation.Version;
        // Act
        conversation.CompleteTurn(id, version, "Hello", null, [new GatewayAssistantMessage("Hello", [])], conversation.Drafts.ToArray(), null, 0);
        var replay = conversation.CompleteTurn(id, version, "Hello", null, [], [], null, 0);
        // Assert
        replay.Should().Be(TurnCommitStatus.NoLongerActive, because: "a turn has one terminal result");
        conversation.Messages.Count(message => message.Role == ConversationMessageRole.Assistant).Should().Be(1,
            because: "duplicate delivery must not duplicate the visible reply");
    }

    [Fact]
    public void Handle_RepeatedToolId_ReplaysWithoutDuplicatingDraft()
    {
        // Arrange
        var workspace = new DraftTools([], "Australia/Perth");
        var executor = new ToolExecutor(workspace, new AiCoachModuleOptions { MaxToolCallsPerTurn = 1 });
        var call = new ModelToolCallRequest("call-1", "create_draft", "{\"items\":[{\"title\":\"Read\"}]}");
        // Act
        var first = executor.Execute(call, default);
        var replay = executor.Execute(call, default);
        var changed = executor.Execute(call with { ArgumentsJson = "{}" }, default);
        var exhausted = executor.Execute(call with { Id = "call-2" }, default);
        // Assert
        first.Succeeded.Should().BeTrue(because: "the first operation is valid");
        replay.Replayed.Should().BeTrue(because: "the same call identity must reuse its result");
        workspace.Drafts.Should().ContainSingle(because: "transport duplication cannot create another draft");
        changed.ErrorCode.Should().Be("tool_call_id_reused", because: "the same ID cannot authorize different data");
        exhausted.ErrorCode.Should().Be("tool_limit", because: "resource budgets apply before execution");
    }

    [Fact]
    public void Handle_CancelledTool_DoesNotMutateWorkspace()
    {
        // Arrange
        var workspace = new DraftTools([], "Australia/Perth");
        var executor = new ToolExecutor(workspace, new AiCoachModuleOptions());
        using var cancel = new CancellationTokenSource();
        cancel.Cancel();
        // Act
        var action = () => executor.Execute(new("call-1", "create_draft", "{\"items\":[{\"title\":\"Read\"}]}"), cancel.Token);
        // Assert
        action.Should().Throw<OperationCanceledException>(because: "cancellation is checked before tool execution");
        workspace.Drafts.Should().BeEmpty(because: "cancelled tools cannot change data");
    }

    [Fact]
    public async Task Handle_SavingDraft_PolicyBlocksConcurrentCommandsAndUiActions()
    {
        // Arrange
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var conversation = await Session(new InMemoryConversationStore(cache));
        var draft = conversation.Drafts[0];
        draft.StartSaving();
        // Act
        var available = OperationPolicy.CanStartOperation(conversation);
        var actions = OperationPolicy.DraftActions(draft, available);
        var begin = () => conversation.BeginTurn(Guid.NewGuid(), "Change the card");
        // Assert
        available.Should().BeFalse(because: "a model workspace must not overlap a task save");
        actions.Should().BeEmpty(because: "UI and application use the same operational policy");
        begin.Should().Throw<InvalidOperationException>(because: "domain invariants protect against bypassing the application check");
    }

    private async Task<Conversation> Session(IConversationStore store)
    {
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var userId = await new DataSeeder(db).CreateUserAsync();
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(), UserId = userId, Mode = AiCoachMode.Execution,
            TimeZoneId = "Australia/Perth", CreatedAt = DateTimeOffset.UtcNow, ExpiresAt = DateTimeOffset.UtcNow.AddHours(1),
        };
        conversation.Drafts.Add(Draft());
        await store.SaveAsync(conversation, default);
        return conversation;
    }

    private static ProposalSet Draft()
    {
        var draft = new ProposalSet { Id = Guid.NewGuid() };
        draft.Replace([new(Guid.NewGuid(), "Read", "Read chapter one", new(2026, 10, 1), new(9, 0), new(9, 30), "Australia/Perth", null)]);
        return draft;
    }
    private static EditedDraftDto Edited(ProposalSet draft, string? description = null) => new()
    {
        Items = draft.Proposals.Select(item => new EditedDraftItemDto
        {
            ItemId = item.ProposalId, Title = item.Title, Description = description ?? item.Description,
            Date = item.Date?.ToString("yyyy-MM-dd"), StartTime = item.StartTime?.ToString("HH:mm"), EndTime = item.EndTime?.ToString("HH:mm"),
            TimeZoneId = item.TimeZoneId, LabelId = item.LabelId,
        }).ToArray(),
    };
    private static ConfirmDraftCommand Command(Conversation conversation, Guid? id = null, string? description = null) => new()
    {
        UserId = conversation.UserId, ConversationId = conversation.Id, DraftId = conversation.Drafts[0].Id,
        Request = new() { CommandId = id ?? Guid.NewGuid(), Action = "add_to_task_list", ExpectedConversationVersion = conversation.Version,
            ExpectedDraftVersion = conversation.Drafts[0].Version, EditedDraft = Edited(conversation.Drafts[0], description) },
    };
    private static ConfirmDraftCommandHandler Confirm(IConversationStore store, BlotzTaskDbContext db) => new(store,
        new AddTaskCommandHandler(db, NullLogger<AddTaskCommandHandler>.Instance),
        new CreateRecurringTaskCommandHandler(db, NullLogger<CreateRecurringTaskCommandHandler>.Instance),
        db, TimeProvider.System, NullLogger<ConfirmDraftCommandHandler>.Instance);
    private static JsonElement Call(DraftTools tools, string name, object args) =>
        JsonSerializer.Deserialize<JsonElement>(tools.Execute(new(Guid.NewGuid().ToString(), name, JsonSerializer.Serialize(args))));
}

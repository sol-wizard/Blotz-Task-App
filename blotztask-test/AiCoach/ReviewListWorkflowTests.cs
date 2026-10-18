using System.Text.Json;
using System.Text.Json.Nodes;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Api;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class ReviewListWorkflowTests(DatabaseFixture fixture) : IClassFixture<DatabaseFixture>
{
    [Fact]
    public async Task Handle_NotesInScheduleCheck_OnlyChecksTaskIntervals()
    {
        // Arrange
        await using var session = await Evaluation.CoachTestSession.CreateAsync(fixture);
        // Act
        var mixed = await session.Checker.CheckAsync(session.UserId,
            [Evaluation.CoachTestSession.Item(), NoteItem()], false, default);
        var notes = await session.Checker.CheckAsync(session.UserId, [NoteItem()], false, default);
        // Assert
        mixed.Status.Should().Be("clear", because: "notes with no date cannot make a task schedule incomplete");
        notes.Status.Should().Be("clear", because: "a note-only list has no task intervals to check");
    }

    [Fact]
    public void Handle_RemoveLastItemThenCapture_StartsNewPendingBatch()
    {
        // Arrange
        var tools = new DraftTools([], "Australia/Perth", reviewListEnabled: true);
        Call(tools, "add_items", new { items = new[] { new { kind = "note", title = "First" } }, successReply = "待确认" });
        var original = tools.Drafts.Single();
        // Act
        var removed = Call(tools, "remove_items", new { itemIds = new[] { original.Proposals.Single().ProposalId }, successReply = "已移除" });
        Call(tools, "add_items", new { items = new[] { new { kind = "note", title = "Second" } }, successReply = "待确认" });
        // Assert
        removed.GetProperty("success").GetBoolean().Should().BeTrue(because: "the final pending item can be removed");
        original.Status.Should().Be(ProposalSetStatus.Rejected, because: "an empty batch is no longer actionable");
        tools.Drafts.Where(draft => draft.Status == ProposalSetStatus.Pending).Should().ContainSingle(
            because: "the next capture creates exactly one current review list");
        tools.Drafts.Last().Id.Should().NotBe(original.Id, because: "a finished batch is never reopened");
    }

    [Theory]
    [InlineData("5", false)]
    [InlineData("6", true)]
    public async Task Handle_ProtocolOptIn_ControlsMixedListProjection(string version, bool visible)
    {
        // Arrange
        using var services = Services();
        var store = Store(services);
        var conversation = await Session(store, [NoteItem()]);
        var http = new DefaultHttpContext();
        http.Request.Headers[ReviewListProtocolFilter.HeaderName] = version;
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor());
        var context = new ActionExecutingContext(action, [], new Dictionary<string, object?>(), new object());
        var result = new OkObjectResult(ConversationSnapshotProjector.ToDto(conversation));
        // Act
        await new ReviewListProtocolFilter(store, Options.Create(new JsonOptions())).OnActionExecutionAsync(context,
            () => Task.FromResult(new ActionExecutedContext(action, [], new object()) { Result = result }));
        // Assert
        var json = (JsonNode)result.Value!;
        json["protocolVersion"]!.GetValue<int>().Should().Be(int.Parse(version), because: "the response honors the negotiated protocol");
        json.AsObject().ContainsKey("pendingList").Should().Be(visible, because: "only protocol 6 exposes a mixed list");
        json["artifacts"]!.AsArray().Count.Should().Be(visible ? 1 : 0, because: "legacy clients cannot render note artifacts");
    }

    [Fact]
    public async Task Handle_LegacyMutationOfReviewList_ReturnsConflictBeforeAction()
    {
        // Arrange
        using var services = Services();
        var store = Store(services);
        var conversation = await Session(store, [NoteItem()]);
        var http = new DefaultHttpContext();
        http.Request.Method = "PUT";
        http.Items["UserId"] = conversation.UserId;
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor());
        var context = new ActionExecutingContext(action, [], new Dictionary<string, object?>
        {
            ["conversationId"] = conversation.Id, ["draftId"] = conversation.Drafts[0].Id,
        }, new object());
        var invoked = false;
        // Act
        await new ReviewListProtocolFilter(store, Options.Create(new JsonOptions())).OnActionExecutionAsync(context, () =>
        {
            invoked = true;
            return Task.FromResult(new ActionExecutedContext(action, [], new object()));
        });
        // Assert
        invoked.Should().BeFalse(because: "legacy draft editing must not silently remove notes");
        context.Result.Should().BeOfType<ConflictObjectResult>(because: "the client must opt in before mutating mixed lists");
    }

    [Fact]
    public async Task Handle_MixedBatch_SavesTaskRecurringTaskAndNoteExactlyOnce()
    {
        // Arrange
        using var services = Services();
        var store = Store(services);
        var conversation = await Session(store, [TaskItem(), NoteItem(), TaskItem() with
        {
            Title = "Daily reading", Recurrence = new(RecurrenceFrequency.Daily, 1, null, null, null),
        }]);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var command = Command(conversation);
        var handler = Handler(store, db);
        // Act
        var first = await handler.Handle(command);
        var replay = await handler.Handle(command);
        var newCommand = await handler.Handle(Command(conversation));
        // Assert
        first.Status.Should().Be("succeeded", because: "one transaction supports every review item kind");
        first.PersistedEntities.Select(item => item.Kind).Should().BeEquivalentTo(
            ["task", "recurring_task", "note"], because: "each item routes to its existing module");
        replay.PersistedEntities.Should().BeEquivalentTo(first.PersistedEntities,
            because: "the same command returns the original entities");
        newCommand.PersistedEntities.Should().BeEquivalentTo(first.PersistedEntities,
            because: "a completed batch cannot be saved again with a new command ID");
        (await db.TaskItems.CountAsync(item => item.UserId == conversation.UserId)).Should().Be(1,
            because: "retries cannot duplicate ordinary tasks");
        (await db.RecurringTasks.CountAsync(item => item.UserId == conversation.UserId)).Should().Be(1,
            because: "recurring creation joins the batch transaction");
        (await db.Notes.SingleAsync(item => item.UserId == conversation.UserId)).Text.Should().Be("APA\nUse seventh edition",
            because: "note title and detail map to the existing note text field");
        (await db.AiCoachDraftConfirmations.CountAsync(item => item.ConversationId == conversation.Id)).Should().Be(1,
            because: "only one durable confirmation is allowed per batch");
        first.ConversationSnapshot.PendingList.Should().BeNull(because: "successful confirmation empties the pending list");
    }

    [Fact]
    public async Task Handle_LaterTaskFails_RollsBackEarlierNoteTaskAndReceipt()
    {
        // Arrange
        using var services = Services();
        var store = Store(services);
        var conversation = await Session(store, [NoteItem(), TaskItem(), TaskItem() with { LabelId = int.MaxValue }]);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        // Act
        var result = await Handler(store, db).Handle(Command(conversation));
        // Assert
        result.Status.Should().Be("failed", because: "an invalid task rejects the complete mixed batch");
        (await db.Notes.AnyAsync(item => item.UserId == conversation.UserId)).Should().BeFalse(
            because: "even a note inserted before the failure rolls back");
        (await db.TaskItems.AnyAsync(item => item.UserId == conversation.UserId)).Should().BeFalse(
            because: "an earlier valid task cannot remain after batch failure");
        (await db.AiCoachDraftConfirmations.AnyAsync(item => item.ConversationId == conversation.Id)).Should().BeFalse(
            because: "a failed batch must not leave a successful receipt");
        result.ConversationSnapshot.PendingList!.Status.Should().Be("pending",
            because: "the user must be able to correct and retry the list");

        // Act: correct the rejected label and retry with current versions and a new command ID.
        var pending = (await store.FindAsync(conversation.Id, default))!;
        pending.Drafts[0].Replace(pending.Drafts[0].Proposals.Select(item => item with { LabelId = null }).ToArray());
        pending.Touch();
        await store.SaveAsync(pending, default);
        var retried = await Handler(store, db).Handle(Command(pending));
        // Assert
        retried.Status.Should().Be("succeeded", because: "a rolled-back batch remains retryable after correction");
        (await db.Notes.CountAsync(item => item.UserId == conversation.UserId)).Should().Be(1,
            because: "retry saves the note once after the earlier rollback");
        (await db.TaskItems.CountAsync(item => item.UserId == conversation.UserId)).Should().Be(2,
            because: "retry saves both corrected tasks once");
    }

    [Fact]
    public async Task Handle_RetentionPrunesDraft_RemovesReceiptTextButKeepsSavedNote()
    {
        // Arrange
        using var services = Services();
        var store = Store(services);
        var conversation = await Session(store, [NoteItem()]);
        var old = FixedClock.Now.AddDays(-181);
        var oldTurn = Guid.NewGuid();
        conversation.BeginTurn(oldTurn, "Record APA", old);
        conversation.CompleteTurn(oldTurn, conversation.Version, "Awaiting review", null, [],
            conversation.Drafts.ToArray(), null, 0, completedAt: old);
        await store.SaveAsync(conversation, default);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        await Handler(store, db).Handle(Command(conversation));
        var current = (await store.FindAsync(conversation.Id, default))!;
        var recentTurn = Guid.NewGuid();
        current.BeginTurn(recentTurn, "Hello", FixedClock.Now);
        current.CompleteTurn(recentTurn, current.Version, "Hello", null, [], current.Drafts.ToArray(), null, 0,
            completedAt: FixedClock.Now);
        await store.SaveAsync(current, default);
        // Act
        await new AiCoachTraceRetentionService(services.GetRequiredService<IServiceScopeFactory>(), new FixedClock(),
            Options.Create(new AiCoachModuleOptions()), NullLogger<AiCoachTraceRetentionService>.Instance).CleanupAsync(default);
        // Assert
        (await db.AiCoachDraftConfirmations.AnyAsync(item => item.ConversationId == conversation.Id)).Should().BeFalse(
            because: "expired draft text must not survive inside the durable receipt");
        (await db.Notes.CountAsync(item => item.UserId == conversation.UserId)).Should().Be(1,
            because: "chat retention does not delete notes the user explicitly saved");
        (await store.FindAsync(conversation.Id, default))!.Drafts.Should().BeEmpty(
            because: "the receipt must not resurrect the pruned draft on the next load");
    }

    [Fact]
    public async Task Handle_CommitBeforeConversationUpdate_RecoversOnOpenAndRetry()
    {
        // Arrange
        using var services = Services();
        var store = Store(services);
        var conversation = await Session(store, [TaskItem(), NoteItem()]);
        var command = Command(conversation);
        conversation.Drafts[0].StartSaving(FixedClock.Now.AddMinutes(-6));
        conversation.Receipts[command.Request.CommandId] = new(conversation.Drafts[0].Id, "interrupted", null);
        var interruptedPayload = ConversationSerializer.Serialize(conversation);
        // Keep the original editable state for the real confirmation.
        conversation.Drafts[0].ReleaseInterruptedSave();
        conversation.Receipts.Clear();
        await store.SaveAsync(conversation, default);
        command = Command(conversation, command.Request.CommandId);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var first = await Handler(store, db).Handle(command);
        // Simulate the process stopping after entity/receipt commit, before the final state save.
        await db.AiCoachConversations.Where(item => item.Id == conversation.Id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Payload, interruptedPayload));
        // Act
        var recovered = (await Store(services).FindAsync(conversation.Id, default))!;
        var replay = await Handler(Store(services), db).Handle(command);
        // Assert
        recovered.Drafts[0].Status.Should().Be(ProposalSetStatus.Completed,
            because: "opening the conversation applies the authoritative committed receipt");
        replay.PersistedEntities.Should().BeEquivalentTo(first.PersistedEntities,
            because: "retry recovers existing entity identities after an interrupted state update");
        (await db.Notes.CountAsync(item => item.UserId == conversation.UserId)).Should().Be(1,
            because: "an interrupted reply cannot duplicate a note");
        (await db.TaskItems.CountAsync(item => item.UserId == conversation.UserId)).Should().Be(1,
            because: "an interrupted reply cannot duplicate a task");
    }

    [Fact]
    public async Task Handle_ReusedCommandWithChangedContent_Rejects()
    {
        // Arrange
        using var services = Services();
        var store = Store(services);
        var conversation = await Session(store, [NoteItem()]);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var command = Command(conversation);
        var handler = Handler(store, db);
        await handler.Handle(command);
        var changed = Command(conversation, command.Request.CommandId, "Changed note");
        // Act
        var action = () => handler.Handle(changed);
        // Assert
        (await action.Should().ThrowAsync<DraftConflictException>(because: "a command ID binds the reviewed content"))
            .Which.ErrorCode.Should().Be("IdempotencyKeyReused", because: "content changes require a new command ID");
    }

    [Fact]
    public async Task Handle_UnscheduledTask_RemainsPendingWithoutWritingEntities()
    {
        // Arrange
        using var services = Services();
        var store = Store(services);
        var conversation = await Session(store, [TaskItem() with { Date = null, StartTime = null, EndTime = null }, NoteItem()]);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        // Act
        var action = () => Handler(store, db).Handle(Command(conversation));
        // Assert
        (await action.Should().ThrowAsync<DraftFieldValidationException>(because: "task scheduling is required only at confirmation"))
            .Which.ErrorCode.Should().Be("ScheduleRequired", because: "the client needs a stable actionable error");
        (await db.Notes.AnyAsync(item => item.UserId == conversation.UserId)).Should().BeFalse(
            because: "validation completes before any mixed-batch writes");
        ConversationSnapshotProjector.ToDto(conversation).PendingList!.CanConfirm.Should().BeFalse(
            because: "W5 must show the unscheduled list without enabling confirmation");
    }

    [Fact]
    public async Task Handle_UserEditsTime_ClearsOnlyChangedSuggestionFlag()
    {
        // Arrange
        using var services = Services();
        var store = Store(services);
        var conversation = await Session(store, [TaskItem() with { SuggestedFields = ["date", "startTime", "endTime"] }, NoteItem()]);
        var draft = conversation.Drafts[0];
        var edited = Edited(draft);
        edited.Items[0].Should().NotBeNull(because: "the first entry is the task under review");
        var requestItems = edited.Items.Select((item, index) => index == 0 ? new EditedDraftItemDto
        {
            ItemId = item.ItemId, Title = item.Title, Date = item.Date, StartTime = "09:15", EndTime = item.EndTime,
            TimeZoneId = item.TimeZoneId,
        } : item).ToArray();
        // Act
        var snapshot = await new EditDraftCommandHandler(store).Handle(conversation.UserId, conversation.Id, draft.Id,
            new(conversation.Version, draft.Version, new() { Items = requestItems }), default);
        // Assert
        snapshot.PendingList!.Payload.Items[0].SuggestedFields.Should().BeEquivalentTo(["date", "endTime"],
            because: "editing one time field does not adopt the other AI-suggested fields");
    }

    [Fact]
    public async Task Handle_ReviewTools_AccumulatesMixedItemsAndPreservesSuccessReply()
    {
        // Arrange
        var tools = new DraftTools([], "Australia/Perth", reviewListEnabled: true);
        var executor = new ToolExecutor(tools, new AiCoachModuleOptions());
        var first = new ModelToolCallRequest("first", "add_items", JsonSerializer.Serialize(new
        {
            items = new object[] { new { kind = "note", title = "APA", description = "Use seventh edition" } },
            successReply = "已放入待确认清单。",
        }));
        // Act
        var result = await executor.ExecuteAsync(first, default);
        var second = await executor.ExecuteAsync(new("second", "add_items", JsonSerializer.Serialize(new
        {
            items = new object[] { new { kind = "task", title = "Read", date = "2026-10-20", startTime = "09:00", endTime = "09:30", suggestedFields = new[] { "endTime" } } },
            successReply = "任务也放进待确认清单。",
        })), default);
        // Assert
        result.SuccessReply.Should().Be("已放入待确认清单。", because: "W4 preserves the existing prewritten reply mechanism");
        second.Succeeded.Should().BeTrue(because: "task and note entries can share the current review list");
        tools.Drafts.Should().ContainSingle(because: "later captures append to the same pending batch");
        tools.Drafts[0].Proposals.Should().HaveCount(2, because: "both captures remain available for review");
        foreach (var definition in executor.AvailableTools)
        {
            using var schema = JsonDocument.Parse(definition.ParametersJsonSchema);
            schema.RootElement.GetProperty("required").EnumerateArray().Select(item => item.GetString())
                .Should().Contain("successReply", because: "every review mutation retains the required successReply field");
        }
    }

    [Fact]
    public void Handle_InvalidLaterReviewUpdate_DoesNotApplyEarlierChange()
    {
        // Arrange
        var tools = new DraftTools([], "Australia/Perth", reviewListEnabled: true);
        Call(tools, "add_items", new { items = new[] { new { kind = "note", title = "Original" } }, successReply = "待确认" });
        var draft = tools.Drafts[0];
        var version = draft.Version;
        // Act
        var result = Call(tools, "update_items", new { items = new object[]
        {
            new { itemId = draft.Proposals[0].ProposalId, fields = new { title = "Changed" } },
            new { itemId = Guid.NewGuid(), fields = new { title = "Unknown" } },
        }, successReply = "已修改" });
        // Assert
        result.GetProperty("success").GetBoolean().Should().BeFalse(because: "all requested edits must validate");
        draft.Proposals[0].Title.Should().Be("Original", because: "a later invalid update rolls back earlier changes");
        draft.Version.Should().Be(version, because: "invalid mutations must not advance the version");
    }

    [Fact]
    public void Handle_NoteWithTaskFields_RejectsWithoutAddingAnything()
    {
        // Arrange
        var tools = new DraftTools([], "Australia/Perth", reviewListEnabled: true);
        // Act
        var result = Call(tools, "add_items", new
        {
            items = new[] { new { kind = "note", title = "APA", date = "2026-10-20" } }, successReply = "待确认",
        });
        // Assert
        result.GetProperty("success").GetBoolean().Should().BeFalse(because: "notes cannot accidentally inherit task scheduling");
        tools.Drafts.Should().BeEmpty(because: "a rejected capture must not leave a partial list");
    }

    [Fact]
    public async Task Handle_LegacyResponse_HidesMixedListsAndKeepsProtocolFive()
    {
        // Arrange
        using var services = Services();
        var store = Store(services);
        var conversation = await Session(store, [TaskItem(), NoteItem()]);
        var http = new DefaultHttpContext();
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor());
        var context = new ActionExecutingContext(action, [], new Dictionary<string, object?>(), new object());
        var result = new OkObjectResult(ConversationSnapshotProjector.ToDto(conversation));
        var filter = new ReviewListProtocolFilter(store, Options.Create(new JsonOptions()));
        // Act
        await filter.OnActionExecutionAsync(context, () => Task.FromResult(new ActionExecutedContext(action, [], new object()) { Result = result }));
        // Assert
        var json = (JsonNode)result.Value!;
        json["protocolVersion"]!.GetValue<int>().Should().Be(5, because: "protocol 6 requires explicit client opt-in");
        json["artifacts"]!.AsArray().Should().BeEmpty(because: "an old task-card client cannot render mixed entries");
        json.AsObject().ContainsKey("pendingList").Should().BeFalse(because: "legacy clients retain their existing response shape");
    }

    private ServiceProvider Services() => new ServiceCollection()
        .AddScoped(_ => new BlotzTaskDbContext(fixture.Options)).BuildServiceProvider();

    private static SqlConversationStore Store(ServiceProvider services) => new(
        services.GetRequiredService<IServiceScopeFactory>(), new FixedClock(), Options.Create(new AiCoachModuleOptions()),
        NullLogger<SqlConversationStore>.Instance);

    private async Task<Conversation> Session(SqlConversationStore store, IReadOnlyList<TaskProposal> items)
    {
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(), UserId = await new DataSeeder(db).CreateUserAsync(), Mode = AiCoachMode.Unified,
            CreatedAt = FixedClock.Now, TimeZoneId = "Australia/Perth",
        };
        var draft = new ProposalSet { Id = Guid.NewGuid(), IsReviewList = true };
        draft.Replace(items);
        conversation.Drafts.Add(draft);
        await store.CreateAsync(conversation, default);
        return conversation;
    }

    private static ConfirmDraftCommandHandler Handler(IConversationStore store, BlotzTaskDbContext db) => new(store,
        new AddTaskCommandHandler(db, NullLogger<AddTaskCommandHandler>.Instance),
        new CreateRecurringTaskCommandHandler(db, NullLogger<CreateRecurringTaskCommandHandler>.Instance),
        db, new FixedClock(), NullLogger<ConfirmDraftCommandHandler>.Instance);

    private static ConfirmDraftCommand Command(Conversation conversation, Guid? commandId = null, string? title = null) => new()
    {
        UserId = conversation.UserId, ConversationId = conversation.Id, DraftId = conversation.Drafts[0].Id,
        Request = new()
        {
            CommandId = commandId ?? Guid.NewGuid(), Action = "add_all", ExpectedConversationVersion = conversation.Version,
            ExpectedDraftVersion = conversation.Drafts[0].Version, EditedDraft = Edited(conversation.Drafts[0], title),
        },
    };

    private static EditedDraftDto Edited(ProposalSet draft, string? title = null) => new()
    {
        Items = draft.Proposals.Select(item => new EditedDraftItemDto
        {
            ItemId = item.ProposalId, Title = title ?? item.Title, Description = item.Description,
            Kind = item.Kind.ToString().ToLowerInvariant(), Date = item.Date?.ToString("yyyy-MM-dd"),
            StartTime = item.StartTime?.ToString("HH:mm"), EndTime = item.EndTime?.ToString("HH:mm"),
            TimeZoneId = item.TimeZoneId, LabelId = item.LabelId,
            Recurrence = item.Recurrence is { } recurrence ? new()
            {
                Frequency = recurrence.Frequency.ToString(), Interval = recurrence.Interval, DaysOfWeek = recurrence.DaysOfWeek,
                DayOfMonth = recurrence.DayOfMonth, EndDate = recurrence.EndDate?.ToString("yyyy-MM-dd"),
            } : null,
        }).ToArray(),
    };

    private static TaskProposal TaskItem() => new(Guid.NewGuid(), "Read", null, new(2026, 10, 20), new(9, 0), new(10, 0), "Australia/Perth", null);
    private static TaskProposal NoteItem() => new(Guid.NewGuid(), "APA", "Use seventh edition", null, null, null, "Australia/Perth", null, Kind: ProposalKind.Note);
    private static JsonElement Call(DraftTools tools, string name, object args) =>
        JsonSerializer.Deserialize<JsonElement>(tools.Execute(new(Guid.NewGuid().ToString(), name, JsonSerializer.Serialize(args))));

    private sealed class FixedClock : TimeProvider
    {
        public static readonly DateTimeOffset Now = new(2026, 10, 18, 8, 0, 0, TimeSpan.FromHours(8));
        public override DateTimeOffset GetUtcNow() => Now;
    }
}

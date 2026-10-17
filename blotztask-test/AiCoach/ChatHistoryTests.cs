using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using Session = BlotzTask.Tests.AiCoach.ConversationSegmentTests.Session;

namespace BlotzTask.Tests.AiCoach;

public sealed class ChatHistoryTests(DatabaseFixture fixture) : IClassFixture<DatabaseFixture>
{
    [Fact]
    public async Task Handle_LargeOpenTopic_ReturnsRecentSnapshotAndPagesTheRest()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        for (var index = 0; index < 35; index++)
            session.Open.Messages.Add(new(Guid.NewGuid(), ConversationMessageRole.User, $"Message {index}",
                CreatedAt: session.Clock.Now.AddSeconds(index)));
        await session.Store.SaveAsync(session.Open, default);
        // Act
        var snapshot = await session.Chat.OpenAsync(session.UserId, "Australia/Perth", default);
        var first = await session.Chat.MessagesAsync(session.UserId, null, 30, default);
        var second = await session.Chat.MessagesAsync(session.UserId, first.NextCursor, 30, default);
        // Assert
        snapshot.Messages.Should().HaveCount(30, because: "snapshots remain bounded while the full timeline is paged");
        snapshot.Messages.Last().Text.Should().Be("Message 34", because: "opening the chat starts at the latest message");
        second.Items.Should().HaveCount(5, because: "the remaining messages are available through the next cursor");
        first.Items.Concat(second.Items).Select(message => message.MessageId).Distinct().Should().HaveCount(35,
            because: "bounding a snapshot must not remove visible history");
    }

    [Fact]
    public async Task Handle_ConfirmPastDraft_RequiresEditingBeforeTaskPersistence()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync(withDraft: true);
        var draft = session.Open.Drafts.Single();
        draft.Replace([draft.Proposals.Single() with { Date = DateOnly.FromDateTime(session.Clock.Now.DateTime).AddDays(-1) }]);
        await session.Store.SaveAsync(session.Open, default);
        var item = draft.Proposals.Single();
        var handler = new ConfirmDraftCommandHandler(session.Store,
            new AddTaskCommandHandler(session.Db, NullLogger<AddTaskCommandHandler>.Instance),
            new CreateRecurringTaskCommandHandler(session.Db, NullLogger<CreateRecurringTaskCommandHandler>.Instance),
            session.Db, session.Clock, NullLogger<ConfirmDraftCommandHandler>.Instance);
        // Act
        var confirm = () => handler.Handle(new()
        {
            UserId = session.UserId, ConversationId = session.Open.Id, DraftId = draft.Id,
            Request = new()
            {
                CommandId = Guid.NewGuid(), Action = "add_to_task_list", ExpectedConversationVersion = session.Open.Version,
                ExpectedDraftVersion = draft.Version, EditedDraft = new() { Items = [new()
                {
                    ItemId = item.ProposalId, Title = item.Title, Date = item.Date!.Value.ToString("yyyy-MM-dd"),
                    StartTime = "20:00", EndTime = "20:30", TimeZoneId = item.TimeZoneId,
                }] },
            },
        });
        // Assert
        (await confirm.Should().ThrowAsync<DraftFieldValidationException>(because: "past schedules must be edited before saving"))
            .Which.ErrorCode.Should().Be("ScheduleInPast", because: "clients need a stable error code for the time warning");
        (await session.Db.TaskItems.AnyAsync(task => task.UserId == session.UserId)).Should().BeFalse(
            because: "validation must happen before task writes");
    }

    [Fact]
    public async Task Handle_TimelinePaging_HandlesTiedTimesAcrossTopicsWithoutForeignMessages()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync(withDraft: true);
        var next = await session.Segments.NewTopicAsync(session.UserId, "Australia/Perth", default);
        var turn = Guid.NewGuid();
        next.BeginTurn(turn, "Second topic", session.Clock.Now);
        next.CompleteTurn(turn, next.Version, "Reply", null, [], [], null, 0, completedAt: session.Clock.Now);
        await session.Store.SaveAsync(next, default);
        await using var foreign = await Session.CreateAsync(fixture);
        await foreign.AddTurnAsync();
        await session.Db.AiCoachMessages.Where(message => message.UserId == session.UserId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(message => message.CreatedAt, session.Clock.Now));
        var expected = await session.Db.AiCoachMessages.Where(message => message.UserId == session.UserId)
            .OrderByDescending(message => message.CreatedAt).ThenByDescending(message => message.Id).Select(message => message.Id).ToArrayAsync();
        // Act
        var first = await session.Chat.MessagesAsync(session.UserId, null, 2, default);
        session.Db.AiCoachMessages.Add(new()
        {
            Id = Guid.NewGuid(), ConversationId = next.Id, UserId = session.UserId,
            Role = ConversationMessageRole.User, Content = "Inserted after page one", CreatedAt = session.Clock.Now.AddSeconds(1),
        });
        await session.Db.SaveChangesAsync();
        var second = await session.Chat.MessagesAsync(session.UserId, first.NextCursor, 2, default);
        // Assert
        first.Items.Concat(second.Items).Select(item => item.MessageId).Should().Equal(expected,
            because: "keyset paging must use SQL Server GUID order and ignore newer inserts between pages");
        second.NextCursor.Should().BeNull(because: "exactly four original messages span two pages");
        first.Items.Concat(second.Items).Count(item => item.TopicStart).Should().Be(2,
            because: "each topic has one first message, including tied timestamps");
        first.Items.Concat(second.Items).SelectMany(item => item.DraftSnapshot).Should().OnlyContain(
            draft => draft.AllowedActions.Count == 0, because: "timeline cards are always read-only");
        (await session.Chat.MessagesAsync(Guid.NewGuid(), null, 30, default)).Items.Should().BeEmpty(
            because: "the timeline is scoped to the authenticated user");
    }

    [Theory]
    [InlineData("invalid cursor", 30)]
    [InlineData(null, 0)]
    [InlineData(null, 101)]
    public async Task Handle_InvalidPagination_RejectsRequest(string? cursor, int limit)
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        // Act
        var load = () => session.Chat.MessagesAsync(session.UserId, cursor, limit, default);
        // Assert
        await load.Should().ThrowAsync<ValidationException>(because: "malformed cursors and unbounded page sizes must not reach timeline queries");
    }

    [Fact]
    public async Task Handle_Clear_RemovesHistoryAndTraceButKeepsFeedbackAndOtherUsers()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync(withDraft: true);
        await using var foreign = await Session.CreateAsync(fixture);
        await foreign.AddTurnAsync();
        var reply = session.Open.Messages.Last();
        session.Db.AiCoachFeedback.Add(new()
        {
            UserId = session.UserId, ConversationId = session.Open.Id, AssistantMessageId = reply.Id,
            TurnId = reply.TurnId!.Value, Rating = "up", CreatedAt = session.Clock.Now, UpdatedAt = session.Clock.Now,
        });
        await session.Db.SaveChangesAsync();
        await session.Trace.RecordAsync(session.UserId, session.Open.Id, reply.TurnId, "test", new { text = "Old trace" });
        // Act
        await session.Chat.ClearAsync(session.UserId, default);
        await session.Trace.RecordAsync(session.UserId, session.Open.Id, reply.TurnId, "late_trace", new { text = "Must not return" });
        // Assert
        (await session.Db.AiCoachConversations.AnyAsync(row => row.UserId == session.UserId)).Should().BeFalse(
            because: "clear hard-deletes all segments");
        (await session.Db.AiCoachMessages.AnyAsync(row => row.UserId == session.UserId)).Should().BeFalse(
            because: "messages cascade with their segments");
        (await session.Db.AiCoachTraceEvents.AnyAsync(row => row.UserId == session.UserId)).Should().BeFalse(
            because: "clear removes traces and late trace writers must not recreate them");
        (await session.Db.AiCoachFeedback.CountAsync(row => row.UserId == session.UserId)).Should().Be(1,
            because: "ratings are intentionally retained for quality review");
        (await session.Db.AiCoachMessages.CountAsync(row => row.UserId == foreign.UserId)).Should().Be(2,
            because: "clear must not affect another user's timeline");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Handle_ClearWhileBusy_RefusesWithoutDeleting(bool saving)
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync(withDraft: true);
        if (saving) session.Open.Drafts.Single().StartSaving(session.Clock.Now);
        else session.Open.BeginTurn(Guid.NewGuid(), "Still running", session.Clock.Now);
        await session.Store.SaveAsync(session.Open, default);
        // Act
        var clear = () => session.Chat.ClearAsync(session.UserId, default);
        // Assert
        await clear.Should().ThrowAsync<DraftConflictException>(because: "clear must wait for active generation or task persistence");
        (await session.Db.AiCoachMessages.CountAsync(row => row.UserId == session.UserId)).Should().BeGreaterThan(0,
            because: "a rejected clear cannot partially delete data");
    }

    [Fact]
    public async Task Handle_Open_RechecksStaleDraftAssessmentsButReusesFreshOnes()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync(withDraft: true);
        // Act
        var first = await session.Chat.OpenAsync(session.UserId, "Australia/Perth", default);
        var second = await session.Chat.OpenAsync(session.UserId, "Australia/Perth", default);
        session.Clock.Now = session.Clock.Now.AddMinutes(11);
        var third = await session.Chat.OpenAsync(session.UserId, "Australia/Perth", default);
        // Assert
        first.Artifacts.Single().Schedule.Should().NotBeNull(because: "opening the chat assesses pending drafts");
        second.ConversationVersion.Should().Be(first.ConversationVersion, because: "a fresh ten-minute assessment does not need another write");
        third.Artifacts.Single().Schedule!.CheckedAt.Should().Be(session.Clock.Now,
            because: "an assessment older than ten minutes is refreshed");
        third.ConversationId.Should().Be(first.ConversationId, because: "opening chat reuses its open segment");
    }

    [Fact]
    public async Task Handle_Retention_RemovesExpiredRowsAndPayloadCopiesButKeepsRecentData()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        var cutoff = session.Clock.Now.AddDays(-180);
        var oldTurn = Guid.NewGuid();
        var oldDraft = new ProposalSet { Id = Guid.NewGuid() };
        oldDraft.Replace([new(Guid.NewGuid(), "old-draft-secret", null, null, null, null, "Australia/Perth", null)]);
        session.Open.BeginTurn(oldTurn, "old-user-secret", cutoff.AddMinutes(-1));
        session.Open.CompleteTurn(oldTurn, session.Open.Version, "old-reply-secret", null,
            [new GatewayAssistantMessage("old-reply-secret", [])], [oldDraft], "old-summary-secret", 0, completedAt: cutoff);
        var currentTurn = Guid.NewGuid();
        var draft = new ProposalSet { Id = Guid.NewGuid() };
        draft.Replace([new(Guid.NewGuid(), "Recent draft", null, null, null, null, "Australia/Perth", null)]);
        session.Open.BeginTurn(currentTurn, "Recent message", session.Clock.Now);
        session.Open.CompleteTurn(currentTurn, session.Open.Version, "Recent reply", null, [], [oldDraft, draft],
            "old-summary-secret", 0, completedAt: session.Clock.Now);
        session.Open.Receipts.Add(Guid.NewGuid(), new(draft.Id, "hash", new()
        {
            CommandId = Guid.NewGuid(), Status = "failed", PersistedEntities = [],
            ConversationSnapshot = ConversationSnapshotProjector.ToDto(session.Open),
        }));
        await session.Store.SaveAsync(session.Open, default);
        await using var foreign = await Session.CreateAsync(fixture);
        await foreign.AddTurnAsync();
        // Act
        await session.Retention.CleanupAsync(default);
        // Assert
        var record = await session.Db.AiCoachConversations.AsNoTracking().SingleAsync(row => row.Id == session.Open.Id);
        record.Payload.Should().NotContain("old-user-secret", because: "retention also scrubs cached receipt snapshots");
        record.Payload.Should().NotContain("old-summary-secret", because: "a rolling summary must not keep deleted content alive");
        record.Payload.Should().NotContain("old-draft-secret", because: "drafts originating in expired messages must be removed");
        record.MessageCount.Should().Be(2, because: "both messages at or beyond the 180-day boundary were deleted");
        (await session.Db.AiCoachMessages.CountAsync(row => row.UserId == foreign.UserId)).Should().Be(2,
            because: "recent messages belonging to other users remain untouched");
    }

    [Fact]
    public async Task Handle_Retention_DeletesEmptyEndedSegmentsButKeepsEmptyOpenSegment()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        var turn = Guid.NewGuid();
        var old = session.Clock.Now.AddDays(-181);
        session.Open.BeginTurn(turn, "Old topic", old);
        session.Open.CompleteTurn(turn, session.Open.Version, "Old reply", null, [], [], null, 0, completedAt: old);
        session.Open.End(old.AddHours(1));
        await session.Store.SaveAsync(session.Open, default);
        await session.Trace.RecordAsync(session.UserId, session.Open.Id, turn, "test", new { text = "Trace" });
        var empty = await session.Segments.OpenAsync(session.UserId, "Australia/Perth", default);
        session.Clock.Now = session.Clock.Now.AddHours(2);
        // Act
        await session.Retention.CleanupAsync(default);
        // Assert
        (await session.Db.AiCoachConversations.AnyAsync(row => row.Id == session.Open.Id)).Should().BeFalse(
            because: "an ended topic whose messages all expired has no remaining value");
        (await session.Db.AiCoachConversations.AnyAsync(row => row.Id == empty.Id)).Should().BeTrue(
            because: "the client holds the open segment's ID, so deleting it would make the next send fail with 404");
        (await session.Db.AiCoachTraceEvents.AnyAsync(row => row.ConversationId == session.Open.Id)).Should().BeFalse(
            because: "orphaned topic traces are removed with empty segments");
    }
}

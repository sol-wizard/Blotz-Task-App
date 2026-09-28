using System.Text.Json;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Tests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.AiCoach.Evaluation;

public sealed class ScheduleBoundaryTests(DatabaseFixture fixture) : IClassFixture<DatabaseFixture>
{
    [Theory]
    [InlineData(30, false)]
    [InlineData(29, true)]
    public async Task Handle_AdjacentOrOverlappingIntervals_UsesHalfOpenBoundaries(int minute, bool conflict)
    {
        // Arrange
        await using var session = await CoachTestSession.CreateAsync(fixture);
        var start = CoachTestSession.Now.AddHours(1).AddMinutes(minute);
        await session.Seeder.CreateTaskAsync(session.UserId, "Existing", start, start.AddMinutes(30));
        // Act
        var result = await session.Checker.CheckAsync(session.UserId, [CoachTestSession.Item()], false, default);
        // Assert
        result.Status.Should().Be(conflict ? "conflict" : "clear", because: "touching boundaries do not overlap");
    }

    [Fact]
    public async Task Handle_CompletedReminderAndForeignTasks_DoNotBlockOwner()
    {
        // Arrange
        await using var session = await CoachTestSession.CreateAsync(fixture);
        var start = CoachTestSession.Now.AddHours(1);
        var done = await session.Seeder.CreateTaskAsync(session.UserId, "Done", start, start.AddMinutes(30));
        done.IsDone = true;
        await session.Db.SaveChangesAsync();
        await session.Seeder.CreateTaskAsync(session.UserId, "Reminder", start, start);
        var other = await session.Seeder.CreateUserAsync();
        await session.Seeder.CreateTaskAsync(other, "Private", start, start.AddMinutes(30));
        // Act
        var assessment = await session.Checker.CheckAsync(session.UserId, [CoachTestSession.Item()], false, default);
        var read = await session.Reader.ReadAsync(session.UserId, "Australia/Perth", CoachTestSession.Today, CoachTestSession.Today, default);
        // Assert
        assessment.Status.Should().Be("clear", because: "only unfinished owner intervals block time");
        read.Should().NotContain("Private", because: "task context must remain scoped to the authenticated owner");
    }

    [Fact]
    public async Task Handle_VirtualRecurrenceAndDraftOverlap_ReportsBoth()
    {
        // Arrange
        await using var session = await CoachTestSession.CreateAsync(fixture);
        await session.Seeder.CreateRecurringTaskAsync(session.UserId, "Daily meeting", RecurrenceFrequency.Daily,
            CoachTestSession.Today, CoachTestSession.Now.AddHours(1), CoachTestSession.Now.AddHours(2));
        var first = CoachTestSession.Item();
        var second = CoachTestSession.Item();
        // Act
        var result = await session.Checker.CheckAsync(session.UserId, [first, second], false, default);
        // Assert
        result.Conflicts.Should().Contain(value => value.TaskTitle == "Daily meeting", because: "virtual occurrences occupy time without materialization");
        result.Conflicts.Should().Contain(value => value.TaskIdentity == $"draft:{second.ProposalId}", because: "items inside the draft also compete for time");
    }

    [Fact]
    public async Task Handle_RecurringDraftWithoutConflict_RemainsPartial()
    {
        // Arrange
        await using var session = await CoachTestSession.CreateAsync(fixture);
        var item = CoachTestSession.Item() with { Recurrence = new(RecurrenceFrequency.Daily, 1, null, null, null) };
        // Act
        var result = await session.Checker.CheckAsync(session.UserId, [item], false, default);
        // Assert
        result.Status.Should().Be("partial", because: "a seven-day check cannot establish unlimited recurrence availability");
    }

    [Fact]
    public async Task Handle_NewConflictAfterReview_RejectsOldTokenThenAllowsReviewedSave()
    {
        // Arrange
        await using var session = await CoachTestSession.CreateAsync(fixture);
        var draft = session.AddDraft(CoachTestSession.Item());
        var start = CoachTestSession.Now.AddHours(1);
        await session.Seeder.CreateTaskAsync(session.UserId, "First conflict", start, start.AddMinutes(30));
        var reviewed = await session.Checker.CheckAsync(session.UserId, draft.Proposals, false, default);
        await session.Seeder.CreateTaskAsync(session.UserId, "New conflict", start, start.AddMinutes(20));
        var handler = session.ConfirmHandler();
        // Act
        var attempt = () => handler.Handle(session.Confirmation(draft, reviewed.ConflictToken));
        var rejected = await attempt.Should().ThrowAsync<DraftConflictException>(because: "the reviewed conflict set changed before confirmation");
        var countBeforeRetry = await session.Db.TaskItems.CountAsync(task => task.UserId == session.UserId);
        var accepted = await handler.Handle(session.Confirmation(draft, draft.Schedule!.ConflictToken));
        // Assert
        rejected.Which.ErrorCode.Should().Be("ScheduleConflict", because: "the client must review the latest conflicts");
        countBeforeRetry.Should().Be(2, because: "rejected confirmation must not create a formal task");
        accepted.Status.Should().Be("succeeded", because: "an explicit override of the current conflicts permits saving");
        (await session.Db.TaskItems.CountAsync(task => task.UserId == session.UserId)).Should().Be(3, because: "the reviewed draft is saved once");
    }

    [Fact]
    public async Task Handle_StartNow_RechecksShiftedInterval()
    {
        // Arrange
        await using var session = await CoachTestSession.CreateAsync(fixture);
        var draft = session.AddDraft(CoachTestSession.Item(12));
        await session.Seeder.CreateTaskAsync(session.UserId, "Busy now", CoachTestSession.Now, CoachTestSession.Now.AddMinutes(20));
        // Act
        var attempt = () => session.ConfirmHandler().Handle(session.Confirmation(draft, action: "start_now"));
        // Assert
        (await attempt.Should().ThrowAsync<DraftConflictException>(because: "starting now moves the task into an occupied interval"))
            .Which.ErrorCode.Should().Be("ScheduleConflict", because: "the original noon slot is irrelevant to start now");
    }

    [Fact]
    public async Task Handle_LargeTaskRead_ExplicitlyMarksTruncation()
    {
        // Arrange
        await using var session = await CoachTestSession.CreateAsync(fixture);
        for (var index = 0; index < 51; index++)
            await session.Seeder.CreateTaskAsync(session.UserId, $"Task {index}", CoachTestSession.Now.AddHours(1), CoachTestSession.Now.AddHours(2));
        // Act
        using var result = JsonDocument.Parse(await session.Reader.ReadAsync(session.UserId, "Australia/Perth", CoachTestSession.Today, CoachTestSession.Today, default));
        // Assert
        result.RootElement.GetProperty("truncated").GetBoolean().Should().BeTrue(because: "partial task context must not imply complete availability");
        result.RootElement.GetProperty("items").GetArrayLength().Should().BeLessThanOrEqualTo(50, because: "task reads have a bounded item budget");
    }

    [Fact]
    public async Task Handle_UnavailableCalendar_RejectsConfirmationWithoutReceipt()
    {
        // Arrange
        await using var session = await CoachTestSession.CreateAsync(fixture);
        var draft = session.AddDraft(CoachTestSession.Item());
        var handler = session.ConfirmHandler();
        // A disposed real DB context exercises the actual reader failure path, without a mock.
        await session.Db.DisposeAsync();
        // Act
        var attempt = () => handler.Handle(session.Confirmation(draft));
        // Assert
        (await attempt.Should().ThrowAsync<DraftConflictException>(because: "unavailable calendar data cannot authorize a save"))
            .Which.ErrorCode.Should().Be("ScheduleUnverified", because: "read failures must remain distinct from a clear schedule");
        session.Conversation.Receipts.Should().BeEmpty(because: "an unverified confirmation must not be accepted");
    }

    [Fact]
    public async Task Handle_OversizedReadRange_RejectsBeforeQuery()
    {
        // Arrange
        await using var session = await CoachTestSession.CreateAsync(fixture);
        // Act
        var attempt = () => session.Reader.ReadAsync(session.UserId, "Australia/Perth",
            CoachTestSession.Today, CoachTestSession.Today.AddDays(7), default);
        // Assert
        await attempt.Should().ThrowAsync<ArgumentException>(because: "inclusive task reads are limited to seven local dates");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Handle_DraftToolScheduleCheck_OnlyClearResultKeepsQuickReply(bool conflict)
    {
        // Arrange
        await using var session = await CoachTestSession.CreateAsync(fixture);
        if (conflict)
            await session.Seeder.CreateTaskAsync(session.UserId, "Meeting", CoachTestSession.Now.AddHours(1), CoachTestSession.Now.AddHours(2));
        var workspace = new DraftTools([], "Australia/Perth");
        var executor = new ToolExecutor(workspace, new AiCoachModuleOptions(), checkSchedule:
            (items, ct) => session.Checker.CheckAsync(session.UserId, items, false, ct));
        var call = new ModelToolCallRequest("create", "create_draft", """
            {"items":[{"title":"Read","date":"2026-10-01","startTime":"09:00","endTime":"09:30"}],"successReply":"Draft ready for review."}
            """);
        // Act
        var result = await executor.ExecuteAsync(call, default);
        // Assert
        result.Succeeded.Should().BeTrue(because: "a scheduling conflict does not erase a valid draft");
        result.SuccessReply.Should().Be(conflict ? null : "Draft ready for review.", because: "conflicts require a model continuation instead of an unchecked quick reply");
        workspace.Drafts.Single().Schedule!.Status.Should().Be(conflict ? "conflict" : "clear", because: "the card must expose the real calendar assessment");
    }
}

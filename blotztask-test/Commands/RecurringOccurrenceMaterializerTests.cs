using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Services;
using BlotzTask.Shared.Exceptions;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class RecurringOccurrenceMaterializerTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DbContextOptions<BlotzTaskDbContext> _options;
    private readonly DataSeeder _seeder;
    private readonly RecurringOccurrenceMaterializer _materializer;

    public RecurringOccurrenceMaterializerTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _options = fixture.Options;
        _seeder = new DataSeeder(_context);
        _materializer = new RecurringOccurrenceMaterializer(_context, new RecurringTaskGeneratorService());
    }

    [Fact]
    public async Task Handle_ValidOccurrenceWithoutExistingTask_CreatesTaskItem()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily Focus",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime,
            scheduleTimeZoneId: "UTC");

        // Act
        var taskItem = await _materializer.EnsureRecurringOccurrenceTaskItem(
            recurring.Id,
            new DateOnly(2026, 6, 2),
            userId);

        // Assert
        taskItem.Id.Should().BeGreaterThan(0, because: "materializing a virtual occurrence should create a persisted task item");
        taskItem.RecurringOccurrenceOverrideId.Should().NotBeNull(because: "materialized recurring occurrences should link through an override row");
        var recurringOverride = await _context.RecurringOccurrenceOverrides.SingleAsync(o => o.Id == taskItem.RecurringOccurrenceOverrideId);
        recurringOverride.RecurringTaskId.Should().Be(recurring.Id, because: "the override links the task item to the recurring rule version");
        recurringOverride.OccurrenceDate.Should().Be(new DateOnly(2026, 6, 2),
            because: "the override records the stable occurrence date independently from scheduled task time");
        recurringOverride.OverrideType.Should().Be(RecurringOccurrenceOverrideType.Materialized,
            because: "plain materialization should not mark the occurrence as user-modified");
        taskItem.UserId.Should().Be(userId, because: "the created occurrence must belong to the current user");
        taskItem.IsDone.Should().BeFalse(because: "materializing alone should not mark the occurrence complete");
        taskItem.StartTime.Should().Be(new DateTimeOffset(2026, 6, 2, 9, 0, 0, TimeSpan.Zero),
            because: "the occurrence date should combine with the template time of day");
        taskItem.EndTime.Should().Be(taskItem.StartTime, because: "single-time recurring tasks should keep start and end equal");
    }

    [Fact]
    public async Task Handle_RecurringDeadlineOccurrence_CreatesTaskDeadline()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8));
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: new DateOnly(2026, 6, 8),
            templateStartTime: templateTime,
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: "Australia/Perth");

        // Act
        var taskItem = await _materializer.EnsureRecurringOccurrenceTaskItem(
            recurring.Id,
            new DateOnly(2026, 6, 15),
            userId);

        var savedTask = await _context.TaskItems
            .Include(t => t.Deadline)
            .SingleAsync(t => t.Id == taskItem.Id);

        // Assert
        savedTask.Deadline.Should().NotBeNull(
            because: "materializing a recurring deadline occurrence should create a concrete TaskDeadline row");
        savedTask.Deadline!.DueAt.Should().Be(
            new DateTimeOffset(2026, 6, 17, 17, 0, 0, TimeSpan.FromHours(8)),
            because: "the concrete deadline should be derived from the occurrence date plus the relative deadline template");
    }

    [Fact]
    public async Task Handle_ExistingOccurrenceWithMovedStartTime_ReturnsExistingTaskItemWithoutCreatingDuplicate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var occurrenceTime = new DateTimeOffset(2026, 6, 3, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily Review",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: occurrenceTime);

        var existing = await _seeder.CreateTaskAsync(userId, "Daily Review", occurrenceTime, occurrenceTime);
        existing.StartTime = new DateTimeOffset(2026, 6, 4, 15, 0, 0, TimeSpan.Zero);
        existing.EndTime = existing.StartTime;
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 3),
            RecurringOccurrenceOverrideType.Modified,
            existing);

        // Act
        var taskItem = await _materializer.EnsureRecurringOccurrenceTaskItem(
            recurring.Id,
            new DateOnly(2026, 6, 3),
            userId);

        var occurrenceCount = await _context.RecurringOccurrenceOverrides
            .CountAsync(o => o.SeriesId == recurring.SeriesId
                && o.OccurrenceDate == new DateOnly(2026, 6, 3));

        // Assert
        taskItem.Id.Should().Be(existing.Id, because: "materialization must use the stable occurrence date identity even when the scheduled start time was edited");
        occurrenceCount.Should().Be(1, because: "calling ensure again should not create duplicate occurrences");
    }

    [Fact]
    public async Task Handle_ConcurrentMaterialization_ReturnsSingleTaskItemWithoutCreatingDuplicate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 5, 9, 0, 0, TimeSpan.Zero);
        var occurrenceDate = new DateOnly(2026, 6, 5);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily Planning",
            frequency: RecurrenceFrequency.Daily,
            startDate: occurrenceDate,
            templateStartTime: templateTime);

        await using var contextA = new BlotzTaskDbContext(_options);
        await using var contextB = new BlotzTaskDbContext(_options);
        var materializerA = new RecurringOccurrenceMaterializer(contextA, new RecurringTaskGeneratorService());
        var materializerB = new RecurringOccurrenceMaterializer(contextB, new RecurringTaskGeneratorService());

        // Act
        var results = await Task.WhenAll(
            materializerA.EnsureRecurringOccurrenceTaskItem(recurring.Id, occurrenceDate, userId),
            materializerB.EnsureRecurringOccurrenceTaskItem(recurring.Id, occurrenceDate, userId));

        var occurrenceCount = await _context.RecurringOccurrenceOverrides
            .CountAsync(o => o.SeriesId == recurring.SeriesId
                && o.OccurrenceDate == occurrenceDate);

        // Assert
        results.Select(t => t.Id).Distinct().Should().ContainSingle(
            because: "concurrent materialization should return the same occurrence instead of surfacing a unique-index conflict");
        occurrenceCount.Should().Be(1, because: "the unique recurring occurrence identity should prevent duplicate task items");
    }

    [Fact]
    public async Task Handle_InvalidOccurrenceDate_ThrowsValidationException()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Monday Planning",
            frequency: RecurrenceFrequency.Weekly,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime,
            daysOfWeek: (int)WeeklyDayFlags.Monday);

        // Act
        var act = async () => await _materializer.EnsureRecurringOccurrenceTaskItem(
            recurring.Id,
            new DateOnly(2026, 6, 2),
            userId);

        // Assert
        await act.Should().ThrowAsync<ValidationException>(
            because: "a Tuesday should not be materialized for a Monday-only recurring task");
    }

    [Fact]
    public async Task Handle_RecurringTaskOwnedByDifferentUser_ThrowsNotFoundException()
    {
        // Arrange
        var ownerId = await _seeder.CreateUserAsync();
        var otherUserId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            ownerId,
            title: "Private Routine",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);

        // Act
        var act = async () => await _materializer.EnsureRecurringOccurrenceTaskItem(
            recurring.Id,
            new DateOnly(2026, 6, 1),
            otherUserId);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>(
            because: "users must not be able to materialize recurring tasks they do not own");
    }

    [Fact]
    public async Task Handle_CompleteOccurrence_MaterializesAndMarksTaskDone()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily Standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);
        var logger = TestDbContextFactory.CreateLogger<SaveRecurringOccurrenceCommandHandler>();
        var handler = new SaveRecurringOccurrenceCommandHandler(_context, _materializer, logger);

        // Act
        var taskItemId = await handler.Handle(new SaveRecurringOccurrenceCommand
        {
            RecurringTaskId = recurring.Id,
            OccurrenceDate = new DateOnly(2026, 6, 2),
            UserId = userId
        }, CancellationToken.None);

        var taskItem = await _context.TaskItems.SingleAsync(t => t.Id == taskItemId);
        var recurringOverride = await _context.RecurringOccurrenceOverrides.SingleAsync(o => o.Id == taskItem.RecurringOccurrenceOverrideId);

        // Assert
        taskItem.IsDone.Should().BeTrue(because: "complete occurrence should mark the materialized task as done");
        taskItem.RecurringOccurrenceOverrideId.Should().Be(recurringOverride.Id,
            because: "completed recurring occurrences should link to the override row instead of duplicating recurring fields on TaskItem");
        recurringOverride.RecurringTaskId.Should().Be(recurring.Id,
            because: "completed recurring occurrences must retain their template link through the override row");
        recurringOverride.OccurrenceDate.Should().Be(new DateOnly(2026, 6, 2),
            because: "completed recurring occurrences must retain their template occurrence date");
    }

    [Fact]
    public async Task Handle_UpdateRecurringOccurrence_MaterializesAndUpdatesTaskItem()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var occurrenceDate = new DateOnly(2026, 6, 2);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily Standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);
        var logger = TestDbContextFactory.CreateLogger<UpdateRecurringOccurrenceCommandHandler>();
        var handler = new UpdateRecurringOccurrenceCommandHandler(
            _context,
            _materializer,
            new TaskItemUpdater(_context),
            logger);

        // Act
        var taskItemId = await handler.Handle(new UpdateRecurringOccurrenceCommand
        {
            RecurringTaskId = recurring.Id,
            OccurrenceDate = occurrenceDate,
            UserId = userId,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Moved standup",
                Description = "Discuss blockers",
                StartTime = new DateTimeOffset(2026, 6, 4, 15, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 4, 16, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.RangeTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);

        var taskItem = await _context.TaskItems.SingleAsync(t => t.Id == taskItemId);
        var recurringOverride = await _context.RecurringOccurrenceOverrides.SingleAsync(o => o.Id == taskItem.RecurringOccurrenceOverrideId);
        var occurrenceCount = await _context.RecurringOccurrenceOverrides.CountAsync(o =>
            o.SeriesId == recurring.SeriesId
            && o.OccurrenceDate == occurrenceDate);

        // Assert
        taskItem.Title.Should().Be("Moved standup", because: "saving a virtual occurrence should apply the edited task fields");
        taskItem.Description.Should().Be("Discuss blockers", because: "the atomic occurrence update should use the normal task update payload");
        taskItem.TimeType.Should().Be(TaskTimeType.RangeTime, because: "the occurrence should support the same time edits as a regular task");
        taskItem.StartTime.Should().Be(new DateTimeOffset(2026, 6, 4, 15, 0, 0, TimeSpan.Zero),
            because: "editing this occurrence only may move the scheduled task time");
        taskItem.RecurringOccurrenceOverrideId.Should().Be(recurringOverride.Id,
            because: "the materialized item should use the override row as its only recurring link");
        recurringOverride.RecurringTaskId.Should().Be(recurring.Id,
            because: "the override must stay linked to its recurring template");
        recurringOverride.OccurrenceDate.Should().Be(occurrenceDate,
            because: "the stable recurring identity must not change when the scheduled time is edited");
        recurringOverride.OverrideType.Should().Be(RecurringOccurrenceOverrideType.Modified,
            because: "saving only this occurrence records a user-level override");
        occurrenceCount.Should().Be(1, because: "the atomic update should not create duplicate task items for the same occurrence");
    }

    [Fact]
    public async Task Handle_UpdateRecurringTaskFuture_SplitsTemplateFromEffectiveDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily Standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);
        var existing = await _seeder.CreateTaskAsync(userId, "Daily Standup", templateTime, templateTime);
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 3),
            RecurringOccurrenceOverrideType.Materialized,
            existing);
        var logger = TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>();
        var handler = new UpdateRecurringTaskFutureCommandHandler(
            _context,
            new RecurringTaskGeneratorService(),
            _materializer,
            new TaskItemUpdater(_context),
            logger);

        // Act
        var futureRecurringTaskId = await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 3),
            UserId = userId,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Future standup",
                Description = "New cadence",
                StartTime = new DateTimeOffset(2026, 6, 3, 10, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 3, 10, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);

        var oldTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var futureTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == futureRecurringTaskId);
        var movedOccurrence = await _context.TaskItems.SingleAsync(t => t.Id == existing.Id);
        var movedOverride = await _context.RecurringOccurrenceOverrides.SingleAsync(o => o.Id == movedOccurrence.RecurringOccurrenceOverrideId);

        // Assert
        oldTemplate.EndDate.Should().Be(new DateOnly(2026, 6, 2),
            because: "future edits should preserve historical occurrences by ending the old template before the effective date");
        futureTemplate.StartDate.Should().Be(new DateOnly(2026, 6, 3),
            because: "future edits should create a new template starting on the selected occurrence date");
        futureTemplate.Title.Should().Be("Future standup",
            because: "the new template should use the edited task fields for future virtual occurrences");
        futureTemplate.ScheduleTimeZoneId.Should().Be(recurring.ScheduleTimeZoneId,
            because: "future edits should preserve the schedule timezone when the request does not change it");
        futureTemplate.Pattern.Frequency.Should().Be(RecurrenceFrequency.Daily,
            because: "future edits without recurrence changes should inherit the previous recurrence rule");
        futureTemplate.TemplateStartTime.TimeOfDay.Should().Be(new TimeSpan(10, 0, 0),
            because: "future virtual occurrences should use the edited time of day");
        movedOccurrence.RecurringOccurrenceOverrideId.Should().Be(movedOverride.Id,
            because: "TaskItem should keep only the override link after a future split");
        movedOverride.RecurringTaskId.Should().Be(futureTemplate.Id,
            because: "a materialized occurrence on the effective date should move to the new template to avoid duplicate calendar rows");
        movedOccurrence.Title.Should().Be("Future standup",
            because: "the selected materialized occurrence should receive the same edited fields as future virtual occurrences");
    }

    [Fact]
    public async Task Handle_UpdateRecurringTaskFuture_DeadlineWithoutDueAt_ThrowsValidationException()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily Standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);
        var handler = new UpdateRecurringTaskFutureCommandHandler(
            _context,
            new RecurringTaskGeneratorService(),
            _materializer,
            new TaskItemUpdater(_context),
            TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>());

        // Act
        var act = async () => await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 3),
            UserId = userId,
            DeadlineTimeZoneId = "Australia/Perth",
            TaskDetails = new EditTaskItemDto
            {
                Title = "Future standup",
                StartTime = new DateTimeOffset(2026, 6, 3, 10, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 3, 10, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = true
            }
        }, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<ValidationException>(
            because: "future recurring deadline edits should be fully validated before database constraints run");
    }

    [Fact]
    public async Task Handle_UpdateRecurringTaskFuture_PrunesOverridesThatDoNotMatchNewRule()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily Standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);

        var effectiveTask = await _seeder.CreateTaskAsync(
            userId,
            "Effective materialized standup",
            new DateTimeOffset(2026, 6, 3, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 3, 9, 0, 0, TimeSpan.Zero));
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 3),
            RecurringOccurrenceOverrideType.Materialized,
            effectiveTask);

        var prunedMaterialized = await _seeder.CreateTaskAsync(
            userId,
            "Pruned materialized standup",
            new DateTimeOffset(2026, 6, 4, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 4, 9, 0, 0, TimeSpan.Zero));
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 4),
            RecurringOccurrenceOverrideType.Materialized,
            prunedMaterialized);

        var prunedModified = await _seeder.CreateTaskAsync(
            userId,
            "Pruned modified standup",
            new DateTimeOffset(2026, 6, 5, 11, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 5, 11, 0, 0, TimeSpan.Zero));
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 5),
            RecurringOccurrenceOverrideType.Modified,
            prunedModified);

        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 6),
            RecurringOccurrenceOverrideType.Skipped);

        var detached = await _seeder.CreateTaskAsync(
            userId,
            "Detached standup",
            new DateTimeOffset(2026, 6, 7, 12, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 7, 12, 0, 0, TimeSpan.Zero));
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 7),
            RecurringOccurrenceOverrideType.Detached,
            detached);

        var retainedWeeklyOccurrence = await _seeder.CreateTaskAsync(
            userId,
            "Retained weekly standup",
            new DateTimeOffset(2026, 6, 10, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 10, 9, 0, 0, TimeSpan.Zero));
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 10),
            RecurringOccurrenceOverrideType.Materialized,
            retainedWeeklyOccurrence);

        var handler = new UpdateRecurringTaskFutureCommandHandler(
            _context,
            new RecurringTaskGeneratorService(),
            _materializer,
            new TaskItemUpdater(_context),
            TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>());

        // Act
        var futureRecurringTaskId = await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 3),
            UserId = userId,
            Frequency = RecurrenceFrequency.Weekly,
            Interval = 1,
            DaysOfWeek = (int)WeeklyDayFlags.Wednesday,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Weekly standup",
                Description = "New weekly cadence",
                StartTime = new DateTimeOffset(2026, 6, 3, 10, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 3, 10, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);

        var futureTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == futureRecurringTaskId);
        var effectiveOverride = await _context.RecurringOccurrenceOverrides
            .Include(o => o.TaskItem)
            .SingleAsync(o => o.SeriesId == recurring.SeriesId
                && o.OccurrenceDate == new DateOnly(2026, 6, 3));
        var retainedOverride = await _context.RecurringOccurrenceOverrides
            .Include(o => o.TaskItem)
            .SingleAsync(o => o.SeriesId == recurring.SeriesId
                && o.OccurrenceDate == new DateOnly(2026, 6, 10));
        var prunedMaterializedStillExists = await _context.TaskItems.AnyAsync(t => t.Id == prunedMaterialized.Id);
        var prunedModifiedStillExists = await _context.TaskItems.AnyAsync(t => t.Id == prunedModified.Id);
        var prunedSkippedStillExists = await _context.RecurringOccurrenceOverrides.AnyAsync(o =>
            o.SeriesId == recurring.SeriesId && o.OccurrenceDate == new DateOnly(2026, 6, 6));
        var detachedStillExists = await _context.TaskItems.AnyAsync(t => t.Id == detached.Id);
        var detachedOverride = await _context.RecurringOccurrenceOverrides.SingleAsync(o =>
            o.SeriesId == recurring.SeriesId && o.OccurrenceDate == new DateOnly(2026, 6, 7));

        // Assert
        futureTemplate.Pattern.Frequency.Should().Be(RecurrenceFrequency.Weekly,
            because: "the future edit should replace the current segment with the requested weekly cadence");
        effectiveOverride.RecurringTaskId.Should().Be(futureTemplate.Id,
            because: "an occurrence that still matches the new rule should move to the replacement template");
        effectiveOverride.TaskItem!.Title.Should().Be("Weekly standup",
            because: "the effective occurrence should receive the edited fields");
        retainedOverride.RecurringTaskId.Should().Be(futureTemplate.Id,
            because: "future occurrences that still match the new weekly rule should stay in the recurring series");
        retainedOverride.TaskItem!.StartTime.Should().Be(
            new DateTimeOffset(2026, 6, 10, 10, 0, 0, TimeSpan.FromHours(8)),
            because: "retained materialized occurrences should be refreshed from the new template time");
        prunedMaterializedStillExists.Should().BeFalse(
            because: "materialized occurrences that no longer match the new future rule should be deleted");
        prunedModifiedStillExists.Should().BeFalse(
            because: "modified occurrences that no longer match the new future rule should also be deleted within the edited segment");
        prunedSkippedStillExists.Should().BeFalse(
            because: "skipped overrides for dates outside the new rule are no longer meaningful");
        detachedStillExists.Should().BeTrue(
            because: "detached occurrences are concrete tasks and should not be managed by future recurrence edits");
        detachedOverride.OverrideType.Should().Be(RecurringOccurrenceOverrideType.Detached,
            because: "future recurrence edits should ignore already detached occurrences");
    }

    [Fact]
    public async Task Handle_UpdateRecurringTaskFuture_ExistingLaterSegment_PreservesLaterSegment()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Original standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);
        var handler = new UpdateRecurringTaskFutureCommandHandler(
            _context,
            new RecurringTaskGeneratorService(),
            _materializer,
            new TaskItemUpdater(_context),
            TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>());

        var laterRecurringTaskId = await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 17),
            UserId = userId,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Later standup",
                StartTime = new DateTimeOffset(2026, 6, 17, 10, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 17, 10, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);

        // Act
        var midRecurringTaskId = await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 13),
            UserId = userId,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Mid standup",
                StartTime = new DateTimeOffset(2026, 6, 13, 11, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 13, 11, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);

        var oldTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var midTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == midRecurringTaskId);
        var laterTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == laterRecurringTaskId);

        // Assert
        oldTemplate.EndDate.Should().Be(new DateOnly(2026, 6, 12),
            because: "editing an earlier date should only truncate the segment that contains that date");
        midTemplate.StartDate.Should().Be(new DateOnly(2026, 6, 13),
            because: "the new segment should start from the selected effective date");
        midTemplate.EndDate.Should().Be(new DateOnly(2026, 6, 16),
            because: "the new segment should inherit the current segment end instead of overwriting later edits");
        midTemplate.Title.Should().Be("Mid standup",
            because: "the selected segment should use the new future-edit details");
        laterTemplate.StartDate.Should().Be(new DateOnly(2026, 6, 17),
            because: "a later segment created by a prior future edit should remain in place");
        laterTemplate.EndDate.Should().BeNull(
            because: "editing an earlier segment should not truncate or deactivate later schedule versions");
        laterTemplate.Title.Should().Be("Later standup",
            because: "later user changes should keep precedence over an earlier future edit");
        laterTemplate.IsActive.Should().BeTrue(
            because: "later schedule versions should remain active after editing an earlier segment");
    }

    [Fact]
    public async Task Handle_UpdateRecurringTaskFuture_StaleTemplateId_ResolvesTemplateForEffectiveDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Original standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);
        var handler = new UpdateRecurringTaskFutureCommandHandler(
            _context,
            new RecurringTaskGeneratorService(),
            _materializer,
            new TaskItemUpdater(_context),
            TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>());

        var laterRecurringTaskId = await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 17),
            UserId = userId,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Later standup",
                StartTime = new DateTimeOffset(2026, 6, 17, 10, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 17, 10, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);

        // Act
        var resolvedRecurringTaskId = await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 18),
            UserId = userId,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Resolved later standup",
                StartTime = new DateTimeOffset(2026, 6, 18, 12, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 18, 12, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);

        var oldTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var laterTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == laterRecurringTaskId);
        var resolvedTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == resolvedRecurringTaskId);

        // Assert
        oldTemplate.EndDate.Should().Be(new DateOnly(2026, 6, 16),
            because: "a stale template id should not be split again when it does not contain the effective date");
        laterTemplate.EndDate.Should().Be(new DateOnly(2026, 6, 17),
            because: "the handler should resolve and split the later segment that actually contains the effective date");
        resolvedTemplate.StartDate.Should().Be(new DateOnly(2026, 6, 18),
            because: "the replacement segment should start from the requested effective date");
        resolvedTemplate.Title.Should().Be("Resolved later standup",
            because: "the future edit should still apply after resolving a stale recurring task id");
        resolvedTemplate.PreviousRecurringTaskId.Should().Be(laterTemplate.Id,
            because: "the new segment should be chained from the resolved template rather than the stale request template");
    }

    [Fact]
    public async Task Handle_MaterializeOccurrence_StaleTemplateId_ResolvesLaterSegment()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Original standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);
        var handler = new UpdateRecurringTaskFutureCommandHandler(
            _context,
            new RecurringTaskGeneratorService(),
            _materializer,
            new TaskItemUpdater(_context),
            TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>());

        var laterRecurringTaskId = await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 17),
            UserId = userId,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Later standup",
                StartTime = new DateTimeOffset(2026, 6, 17, 10, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 17, 10, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);

        // Act
        var taskItem = await _materializer.EnsureRecurringOccurrenceTaskItem(
            recurring.Id,
            new DateOnly(2026, 6, 18),
            userId);

        var recurringOverride = await _context.RecurringOccurrenceOverrides
            .SingleAsync(o => o.Id == taskItem.RecurringOccurrenceOverrideId);

        // Assert
        recurringOverride.RecurringTaskId.Should().Be(laterRecurringTaskId,
            because: "materializing with a stale template id should resolve the rule version that owns the occurrence date");
        taskItem.Title.Should().Be("Later standup",
            because: "the created task should use the resolved later segment template fields");
        taskItem.StartTime.Should().Be(new DateTimeOffset(2026, 6, 18, 10, 0, 0, TimeSpan.FromHours(8)),
            because: "the occurrence should be generated from the resolved segment time of day and timezone");
    }

    [Fact]
    public async Task Handle_CompleteOccurrence_StaleTemplateId_ResolvesLaterSegment()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Original standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);
        var updateFutureHandler = new UpdateRecurringTaskFutureCommandHandler(
            _context,
            new RecurringTaskGeneratorService(),
            _materializer,
            new TaskItemUpdater(_context),
            TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>());

        var laterRecurringTaskId = await updateFutureHandler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 17),
            UserId = userId,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Later standup",
                StartTime = new DateTimeOffset(2026, 6, 17, 10, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 17, 10, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);
        var completeHandler = new SaveRecurringOccurrenceCommandHandler(
            _context,
            _materializer,
            TestDbContextFactory.CreateLogger<SaveRecurringOccurrenceCommandHandler>());

        // Act
        var taskItemId = await completeHandler.Handle(new SaveRecurringOccurrenceCommand
        {
            RecurringTaskId = recurring.Id,
            OccurrenceDate = new DateOnly(2026, 6, 19),
            UserId = userId
        }, CancellationToken.None);

        var taskItem = await _context.TaskItems.SingleAsync(t => t.Id == taskItemId);
        var recurringOverride = await _context.RecurringOccurrenceOverrides
            .SingleAsync(o => o.Id == taskItem.RecurringOccurrenceOverrideId);

        // Assert
        taskItem.IsDone.Should().BeTrue(
            because: "completing an occurrence should still mark the resolved task item done when the request uses a stale template id");
        recurringOverride.RecurringTaskId.Should().Be(laterRecurringTaskId,
            because: "complete occurrence should share materializer template resolution with explicit materialization");
        recurringOverride.OccurrenceDate.Should().Be(new DateOnly(2026, 6, 19),
            because: "the stable occurrence identity should remain the requested date");
    }

    [Fact]
    public async Task Handle_UpdateRecurringTaskFuture_StopRepeating_TruncatesTemplateAndMaterializesEffectiveDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily Standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);
        var futureMaterialized = await _seeder.CreateTaskAsync(
            userId,
            "Future materialized standup",
            new DateTimeOffset(2026, 6, 4, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 4, 9, 0, 0, TimeSpan.Zero));
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 4),
            RecurringOccurrenceOverrideType.Materialized,
            futureMaterialized);
        var futureModified = await _seeder.CreateTaskAsync(
            userId,
            "Future modified standup",
            new DateTimeOffset(2026, 6, 5, 10, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 5, 10, 0, 0, TimeSpan.Zero));
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 5),
            RecurringOccurrenceOverrideType.Modified,
            futureModified);
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 6),
            RecurringOccurrenceOverrideType.Skipped);
        var futureDetached = await _seeder.CreateTaskAsync(
            userId,
            "Future detached standup",
            new DateTimeOffset(2026, 6, 7, 11, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 7, 11, 0, 0, TimeSpan.Zero));
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 7),
            RecurringOccurrenceOverrideType.Detached,
            futureDetached);
        var logger = TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>();
        var handler = new UpdateRecurringTaskFutureCommandHandler(
            _context,
            new RecurringTaskGeneratorService(),
            _materializer,
            new TaskItemUpdater(_context),
            logger);

        // Act
        var futureRecurringTaskId = await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 3),
            UserId = userId,
            StopRepeating = true,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Final standup",
                Description = "Last one",
                StartTime = new DateTimeOffset(2026, 6, 3, 9, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 3, 9, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);

        var oldTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var materializedOverride = await _context.RecurringOccurrenceOverrides
            .Include(o => o.TaskItem)
            .SingleAsync(o => o.SeriesId == recurring.SeriesId
                && o.OccurrenceDate == new DateOnly(2026, 6, 3));
        var materialized = materializedOverride.TaskItem!;
        var futureMaterializedStillExists = await _context.TaskItems
            .AnyAsync(t => t.Id == futureMaterialized.Id);
        var futureModifiedStillExists = await _context.TaskItems
            .AnyAsync(t => t.Id == futureModified.Id);
        var futureNonDetachedOverridesStillExist = await _context.RecurringOccurrenceOverrides
            .AnyAsync(o => o.SeriesId == recurring.SeriesId
                && o.OccurrenceDate > new DateOnly(2026, 6, 3)
                && o.OverrideType != RecurringOccurrenceOverrideType.Detached);
        var futureDetachedStillExists = await _context.TaskItems
            .AnyAsync(t => t.Id == futureDetached.Id);
        var futureDetachedOverride = await _context.RecurringOccurrenceOverrides
            .SingleAsync(o => o.SeriesId == recurring.SeriesId
                && o.OccurrenceDate == new DateOnly(2026, 6, 7));

        // Assert
        futureRecurringTaskId.Should().BeNull(
            because: "stopping repetition from a date should not create a replacement recurring template");
        oldTemplate.EndDate.Should().Be(new DateOnly(2026, 6, 2),
            because: "the old template should stop before the selected effective date");
        materializedOverride.OverrideType.Should().Be(RecurringOccurrenceOverrideType.Detached,
            because: "stopping future repetition turns the selected occurrence into a detached concrete task");
        materialized.Title.Should().Be("Final standup",
            because: "the selected occurrence should remain as a concrete task after repetition stops");
        futureMaterializedStillExists.Should().BeFalse(
            because: "materialized future recurring occurrences should be removed once repetition stops before them");
        futureModifiedStillExists.Should().BeFalse(
            because: "modified future recurring occurrences should be removed once repetition stops before them");
        futureNonDetachedOverridesStillExist.Should().BeFalse(
            because: "future non-detached overrides are no longer part of the series after stop repeating");
        futureDetachedStillExists.Should().BeTrue(
            because: "already detached future occurrences are concrete tasks and should not be deleted with the recurring series");
        futureDetachedOverride.OverrideType.Should().Be(RecurringOccurrenceOverrideType.Detached,
            because: "stop repeating should only clean future recurring overrides, not detached concrete tasks");
    }

    [Fact]
    public async Task Handle_UpdateRecurringTaskFuture_StopRepeatingFromStartDate_MarksSeriesDeleted()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);
        var handler = new UpdateRecurringTaskFutureCommandHandler(
            _context,
            new RecurringTaskGeneratorService(),
            _materializer,
            new TaskItemUpdater(_context),
            TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>());

        // Act
        await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 1),
            UserId = userId,
            StopRepeating = true,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Final standup",
                Description = "Last one",
                StartTime = templateTime,
                EndTime = templateTime,
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);

        var template = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var series = await _context.RecurringTaskSeries.SingleAsync(s => s.Id == recurring.SeriesId);
        var detachedOverride = await _context.RecurringOccurrenceOverrides
            .SingleAsync(o => o.SeriesId == recurring.SeriesId
                && o.OccurrenceDate == new DateOnly(2026, 6, 1));

        // Assert
        template.IsActive.Should().BeFalse(
            because: "stopping repetition from the template start date deactivates the only rule version");
        series.IsDeleted.Should().BeTrue(
            because: "a recurring series should be marked deleted when no active template remains");
        detachedOverride.OverrideType.Should().Be(RecurringOccurrenceOverrideType.Detached,
            because: "the selected occurrence should still be preserved as a concrete task when repetition stops");
    }

    [Fact]
    public async Task Handle_UpdateRecurringTaskFuture_StopRepeatingWithLaterSegment_PreservesLaterSegment()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Original standup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);
        var handler = new UpdateRecurringTaskFutureCommandHandler(
            _context,
            new RecurringTaskGeneratorService(),
            _materializer,
            new TaskItemUpdater(_context),
            TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>());
        var laterRecurringTaskId = await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 17),
            UserId = userId,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Later standup",
                StartTime = new DateTimeOffset(2026, 6, 17, 10, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 17, 10, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);
        var laterTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == laterRecurringTaskId);
        var laterTaskItem = await _seeder.CreateTaskAsync(
            userId,
            "Later materialized standup",
            new DateTimeOffset(2026, 6, 18, 10, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 18, 10, 0, 0, TimeSpan.Zero));
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            laterTemplate,
            new DateOnly(2026, 6, 18),
            RecurringOccurrenceOverrideType.Materialized,
            laterTaskItem);

        // Act
        var futureRecurringTaskId = await handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 6, 13),
            UserId = userId,
            StopRepeating = true,
            TaskDetails = new EditTaskItemDto
            {
                Title = "Final standup",
                StartTime = new DateTimeOffset(2026, 6, 13, 9, 0, 0, TimeSpan.Zero),
                EndTime = new DateTimeOffset(2026, 6, 13, 9, 0, 0, TimeSpan.Zero),
                TimeType = TaskTimeType.SingleTime,
                LabelId = null,
                NotificationId = null,
                AlertTime = null,
                IsDeadline = false
            }
        }, CancellationToken.None);

        var oldTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var preservedLaterTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == laterRecurringTaskId);
        var laterTaskStillExists = await _context.TaskItems.AnyAsync(t => t.Id == laterTaskItem.Id);
        var laterOverrideStillExists = await _context.RecurringOccurrenceOverrides.AnyAsync(o =>
            o.RecurringTaskId == laterRecurringTaskId
            && o.OccurrenceDate == new DateOnly(2026, 6, 18));

        // Assert
        futureRecurringTaskId.Should().BeNull(
            because: "stopping repetition should not create a replacement recurring template");
        oldTemplate.EndDate.Should().Be(new DateOnly(2026, 6, 12),
            because: "stop repeating should truncate only the segment containing the effective date");
        preservedLaterTemplate.IsActive.Should().BeTrue(
            because: "later segments created by earlier future edits should not be deactivated");
        preservedLaterTemplate.StartDate.Should().Be(new DateOnly(2026, 6, 17),
            because: "later segment boundaries should remain unchanged");
        preservedLaterTemplate.EndDate.Should().BeNull(
            because: "stop repeating an earlier segment should not truncate later schedule versions");
        laterTaskStillExists.Should().BeTrue(
            because: "materialized occurrences in later segments should not be removed by stopping an earlier segment");
        laterOverrideStillExists.Should().BeTrue(
            because: "override cleanup should stay within the stopped segment");
    }
}

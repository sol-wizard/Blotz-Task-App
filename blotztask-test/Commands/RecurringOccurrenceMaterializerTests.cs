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
            templateStartTime: templateTime);

        // Act
        var taskItem = await _materializer.EnsureRecurringOccurrenceTaskItem(
            recurring.Id,
            new DateOnly(2026, 6, 2),
            userId);

        // Assert
        taskItem.Id.Should().BeGreaterThan(0, because: "materializing a virtual occurrence should create a persisted task item");
        taskItem.RecurringTaskId.Should().Be(recurring.Id, because: "the task item must remain linked to its recurring template");
        taskItem.RecurringOccurrenceDate.Should().Be(new DateOnly(2026, 6, 2),
            because: "the task item must record the template occurrence date independently from its scheduled start time");
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
        existing.RecurringTaskId = recurring.Id;
        existing.RecurringOccurrenceDate = new DateOnly(2026, 6, 3);
        existing.StartTime = new DateTimeOffset(2026, 6, 4, 15, 0, 0, TimeSpan.Zero);
        existing.EndTime = existing.StartTime;
        await _context.SaveChangesAsync();

        // Act
        var taskItem = await _materializer.EnsureRecurringOccurrenceTaskItem(
            recurring.Id,
            new DateOnly(2026, 6, 3),
            userId);

        var occurrenceCount = await _context.TaskItems
            .CountAsync(t => t.UserId == userId
                && t.RecurringTaskId == recurring.Id
                && t.RecurringOccurrenceDate == new DateOnly(2026, 6, 3));

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

        var occurrenceCount = await _context.TaskItems
            .CountAsync(t => t.UserId == userId
                && t.RecurringTaskId == recurring.Id
                && t.RecurringOccurrenceDate == occurrenceDate);

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

        // Assert
        taskItem.IsDone.Should().BeTrue(because: "complete occurrence should mark the materialized task as done");
        taskItem.RecurringTaskId.Should().Be(recurring.Id, because: "completed recurring occurrences must retain their template link");
        taskItem.RecurringOccurrenceDate.Should().Be(new DateOnly(2026, 6, 2),
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
        var occurrenceCount = await _context.TaskItems.CountAsync(t =>
            t.UserId == userId
            && t.RecurringTaskId == recurring.Id
            && t.RecurringOccurrenceDate == occurrenceDate);

        // Assert
        taskItem.Title.Should().Be("Moved standup", because: "saving a virtual occurrence should apply the edited task fields");
        taskItem.Description.Should().Be("Discuss blockers", because: "the atomic occurrence update should use the normal task update payload");
        taskItem.TimeType.Should().Be(TaskTimeType.RangeTime, because: "the occurrence should support the same time edits as a regular task");
        taskItem.StartTime.Should().Be(new DateTimeOffset(2026, 6, 4, 15, 0, 0, TimeSpan.Zero),
            because: "editing this occurrence only may move the scheduled task time");
        taskItem.RecurringTaskId.Should().Be(recurring.Id, because: "the materialized item must stay linked to its recurring template");
        taskItem.RecurringOccurrenceDate.Should().Be(occurrenceDate,
            because: "the stable recurring identity must not change when the scheduled time is edited");
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
        existing.RecurringTaskId = recurring.Id;
        existing.RecurringOccurrenceDate = new DateOnly(2026, 6, 3);
        await _context.SaveChangesAsync();
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

        // Assert
        oldTemplate.EndDate.Should().Be(new DateOnly(2026, 6, 2),
            because: "future edits should preserve historical occurrences by ending the old template before the effective date");
        futureTemplate.StartDate.Should().Be(new DateOnly(2026, 6, 3),
            because: "future edits should create a new template starting on the selected occurrence date");
        futureTemplate.Title.Should().Be("Future standup",
            because: "the new template should use the edited task fields for future virtual occurrences");
        futureTemplate.Pattern.Frequency.Should().Be(RecurrenceFrequency.Daily,
            because: "future edits without recurrence changes should inherit the previous recurrence rule");
        futureTemplate.TemplateStartTime.TimeOfDay.Should().Be(new TimeSpan(10, 0, 0),
            because: "future virtual occurrences should use the edited time of day");
        movedOccurrence.RecurringTaskId.Should().Be(futureTemplate.Id,
            because: "a materialized occurrence on the effective date should move to the new template to avoid duplicate calendar rows");
        movedOccurrence.Title.Should().Be("Future standup",
            because: "the selected materialized occurrence should receive the same edited fields as future virtual occurrences");
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
        var materialized = await _context.TaskItems.SingleAsync(t =>
            t.RecurringTaskId == recurring.Id
            && t.RecurringOccurrenceDate == new DateOnly(2026, 6, 3));

        // Assert
        futureRecurringTaskId.Should().BeNull(
            because: "stopping repetition from a date should not create a replacement recurring template");
        oldTemplate.EndDate.Should().Be(new DateOnly(2026, 6, 2),
            because: "the old template should stop before the selected effective date");
        materialized.Title.Should().Be("Final standup",
            because: "the selected occurrence should remain as a concrete task after repetition stops");
    }
}

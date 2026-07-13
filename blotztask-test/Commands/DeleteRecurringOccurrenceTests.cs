using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Modules.Tasks.Services;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class DeleteRecurringOccurrenceTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly RecurringTaskGeneratorService _generatorService;
    private readonly DeleteRecurringOccurrenceCommandHandler _handler;

    public DeleteRecurringOccurrenceTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _generatorService = new RecurringTaskGeneratorService();
        var logger = TestDbContextFactory.CreateLogger<DeleteRecurringOccurrenceCommandHandler>();
        _handler = new DeleteRecurringOccurrenceCommandHandler(_context, _generatorService, logger);
    }

    [Fact]
    public async Task Handle_VirtualOccurrence_CreatesSkippedOverride()
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
        await _handler.Handle(new DeleteRecurringOccurrenceCommand
        {
            RecurringTaskId = recurring.Id,
            OccurrenceDate = new DateOnly(2026, 6, 2),
            DeleteFuture = false,
            UserId = userId
        }, CancellationToken.None);

        var recurringOverride = await _context.RecurringOccurrenceOverrides
            .SingleAsync(o => o.SeriesId == recurring.SeriesId
                && o.OccurrenceDate == new DateOnly(2026, 6, 2));

        var queryHandler = new GetTasksByDateQueryHandler(
            _context,
            _generatorService,
            TestDbContextFactory.CreateLogger<GetTasksByDateQueryHandler>());

        var tasks = await queryHandler.Handle(new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2026, 6, 2),
            TimeZoneId = "UTC"
        }, CancellationToken.None);

        // Assert
        recurringOverride.OverrideType.Should().Be(RecurringOccurrenceOverrideType.Skipped,
            because: "deleting one virtual occurrence should suppress only that generated date");
        recurringOverride.RecurringTaskId.Should().Be(recurring.Id,
            because: "the skipped override should remain tied to the template version that produced the date");
        tasks.Should().NotContain(t => t.RecurringOccurrence != null
            && t.RecurringOccurrence.RecurringTaskId == recurring.Id
            && t.RecurringOccurrence.OccurrenceDate == new DateOnly(2026, 6, 2),
            because: "a skipped override should prevent the date query from generating that virtual occurrence again");
    }

    [Fact]
    public async Task Handle_MaterializedOccurrence_RemovesTaskItemAndMarksSkipped()
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
        var materializer = new RecurringOccurrenceMaterializer(_context, _generatorService);
        var materialized = await materializer.EnsureRecurringOccurrenceTaskItem(
            recurring.Id,
            new DateOnly(2026, 6, 3),
            userId,
            CancellationToken.None);

        // Act
        await _handler.Handle(new DeleteRecurringOccurrenceCommand
        {
            RecurringTaskId = recurring.Id,
            OccurrenceDate = new DateOnly(2026, 6, 3),
            DeleteFuture = false,
            UserId = userId
        }, CancellationToken.None);

        var taskStillExists = await _context.TaskItems.AnyAsync(t => t.Id == materialized.Id);
        var recurringOverride = await _context.RecurringOccurrenceOverrides
            .SingleAsync(o => o.SeriesId == recurring.SeriesId
                && o.OccurrenceDate == new DateOnly(2026, 6, 3));

        // Assert
        taskStillExists.Should().BeFalse(
            because: "deleting a materialized recurring occurrence should remove the concrete task item");
        recurringOverride.OverrideType.Should().Be(RecurringOccurrenceOverrideType.Skipped,
            because: "the remaining override should keep the occurrence suppressed after its task item is removed");
        recurringOverride.TaskItem.Should().BeNull(
            because: "a skipped occurrence should not retain a concrete task item");
    }

    [Fact]
    public async Task Handle_DeleteFuture_TruncatesTemplateAndRemovesFutureOccurrences()
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
        var materializer = new RecurringOccurrenceMaterializer(_context, _generatorService);
        var futureTask = await materializer.EnsureRecurringOccurrenceTaskItem(
            recurring.Id,
            new DateOnly(2026, 6, 4),
            userId,
            CancellationToken.None);

        // Act
        await _handler.Handle(new DeleteRecurringOccurrenceCommand
        {
            RecurringTaskId = recurring.Id,
            OccurrenceDate = new DateOnly(2026, 6, 3),
            DeleteFuture = true,
            UserId = userId
        }, CancellationToken.None);

        var template = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var futureTaskStillExists = await _context.TaskItems.AnyAsync(t => t.Id == futureTask.Id);
        var futureOverrideStillExists = await _context.RecurringOccurrenceOverrides
            .AnyAsync(o => o.SeriesId == recurring.SeriesId
                && o.OccurrenceDate >= new DateOnly(2026, 6, 3));

        var queryHandler = new GetTasksByDateQueryHandler(
            _context,
            _generatorService,
            TestDbContextFactory.CreateLogger<GetTasksByDateQueryHandler>());

        var tasks = await queryHandler.Handle(new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2026, 6, 4),
            TimeZoneId = "UTC"
        }, CancellationToken.None);

        // Assert
        template.EndDate.Should().Be(new DateOnly(2026, 6, 2),
            because: "deleting future occurrences should stop the template before the selected date");
        futureTaskStillExists.Should().BeFalse(
            because: "materialized occurrences after the selected date should be removed");
        futureOverrideStillExists.Should().BeFalse(
            because: "future non-detached overrides are no longer needed once the template is truncated");
        tasks.Should().NotContain(t => t.RecurringOccurrence != null
            && t.RecurringOccurrence.RecurringTaskId == recurring.Id,
            because: "the truncated template should not generate future virtual occurrences");
    }

    [Fact]
    public async Task Handle_DeleteFuture_FromStartDate_MarksSeriesDeleted()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily cleanup",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateTime);

        // Act
        await _handler.Handle(new DeleteRecurringOccurrenceCommand
        {
            RecurringTaskId = recurring.Id,
            OccurrenceDate = new DateOnly(2026, 6, 1),
            DeleteFuture = true,
            UserId = userId
        }, CancellationToken.None);

        var template = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var series = await _context.RecurringTaskSeries.SingleAsync(s => s.Id == recurring.SeriesId);

        // Assert
        template.IsActive.Should().BeFalse(
            because: "deleting future occurrences from the template start date deactivates the only rule version");
        series.IsDeleted.Should().BeTrue(
            because: "a series with no remaining active template should no longer be treated as an active recurring series");
    }

    [Fact]
    public async Task Handle_DeleteFuture_ExistingLaterSegment_PreservesLaterSegment()
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
        var updateFutureHandler = CreateUpdateFutureHandler();
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
        await _handler.Handle(new DeleteRecurringOccurrenceCommand
        {
            RecurringTaskId = recurring.Id,
            OccurrenceDate = new DateOnly(2026, 6, 13),
            DeleteFuture = true,
            UserId = userId
        }, CancellationToken.None);

        var oldTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var preservedLaterTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == laterRecurringTaskId);
        var laterTaskStillExists = await _context.TaskItems.AnyAsync(t => t.Id == laterTaskItem.Id);
        var laterOverrideStillExists = await _context.RecurringOccurrenceOverrides.AnyAsync(o =>
            o.RecurringTaskId == laterRecurringTaskId
            && o.OccurrenceDate == new DateOnly(2026, 6, 18));

        // Assert
        oldTemplate.EndDate.Should().Be(new DateOnly(2026, 6, 12),
            because: "deleting future occurrences should truncate only the segment containing the selected date");
        preservedLaterTemplate.IsActive.Should().BeTrue(
            because: "later schedule versions represent explicit future edits and should not be deactivated");
        preservedLaterTemplate.StartDate.Should().Be(new DateOnly(2026, 6, 17),
            because: "later segment boundaries should remain unchanged");
        preservedLaterTemplate.EndDate.Should().BeNull(
            because: "deleting future occurrences from an earlier segment should not truncate later segments");
        laterTaskStillExists.Should().BeTrue(
            because: "materialized occurrences in later segments should not be removed by deleting an earlier segment");
        laterOverrideStillExists.Should().BeTrue(
            because: "future override cleanup should stay within the deleted segment");
    }

    [Fact]
    public async Task Handle_DeleteFuture_StaleTemplateId_ThrowsOutsideRangeValidationException()
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
        var updateFutureHandler = CreateUpdateFutureHandler();
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

        // Act
        var act = () => _handler.Handle(new DeleteRecurringOccurrenceCommand
        {
            RecurringTaskId = recurring.Id,
            OccurrenceDate = new DateOnly(2026, 6, 18),
            DeleteFuture = true,
            UserId = userId
        }, CancellationToken.None);

        var oldTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var laterTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == laterRecurringTaskId);

        // Assert
        await act.Should().ThrowAsync<ValidationException>(
                because: "deleting future occurrences should not redirect a stale template id to another same-series template")
            .WithMessage("OccurrenceDate is outside recurring task range.");
        oldTemplate.EndDate.Should().Be(new DateOnly(2026, 6, 16),
            because: "a stale template id should leave the originally requested template unchanged");
        laterTemplate.EndDate.Should().BeNull(
            because: "a stale template id should leave the later same-series template unchanged");
        laterTemplate.IsActive.Should().BeTrue(
            because: "rejecting a stale id should preserve the active later segment");
    }

    private UpdateRecurringTaskFutureCommandHandler CreateUpdateFutureHandler()
    {
        return new UpdateRecurringTaskFutureCommandHandler(
            _context,
            _generatorService,
            new RecurringOccurrenceMaterializer(_context, _generatorService),
            new TaskItemUpdater(_context),
            TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>());
    }
}

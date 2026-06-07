using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Tasks;
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
            StartDate = new DateTimeOffset(2026, 6, 2, 0, 0, 0, TimeSpan.Zero),
            IncludeFloatingForToday = false
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
            StartDate = new DateTimeOffset(2026, 6, 4, 0, 0, 0, TimeSpan.Zero),
            IncludeFloatingForToday = false
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
}

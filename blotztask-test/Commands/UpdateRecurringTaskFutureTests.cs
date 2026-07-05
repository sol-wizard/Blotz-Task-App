using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Services;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class UpdateRecurringTaskFutureTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly RecurringTaskGeneratorService _generatorService;
    private readonly UpdateRecurringTaskFutureCommandHandler _handler;

    public UpdateRecurringTaskFutureTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _generatorService = new RecurringTaskGeneratorService();
        _handler = new UpdateRecurringTaskFutureCommandHandler(
            _context,
            _generatorService,
            new RecurringOccurrenceMaterializer(_context, _generatorService),
            new TaskItemUpdater(_context),
            TestDbContextFactory.CreateLogger<UpdateRecurringTaskFutureCommandHandler>());
    }

    [Fact]
    public async Task Handle_WeeklyFutureEditMovesStartDate_UsesNewTaskDateAsAnchor()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekend planning",
            frequency: RecurrenceFrequency.Weekly,
            startDate: new DateOnly(2026, 7, 4),
            templateStartTime: new DateTimeOffset(2026, 7, 4, 9, 0, 0, TimeSpan.FromHours(8)),
            daysOfWeek: (int)WeeklyDayFlags.Saturday);

        // Act
        var futureRecurringTaskId = await _handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 7, 4),
            UserId = userId,
            Frequency = RecurrenceFrequency.Weekly,
            Interval = 1,
            DaysOfWeek = (int)WeeklyDayFlags.Sunday,
            TaskDetails = BuildTaskDetails(
                "Weekend planning",
                new DateTimeOffset(2026, 7, 5, 9, 0, 0, TimeSpan.FromHours(8)))
        }, CancellationToken.None);

        var oldTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var futureTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == futureRecurringTaskId);

        // Assert
        oldTemplate.IsActive.Should().BeFalse(
            because: "editing from the first occurrence should retire the old weekly rule version");
        futureTemplate.StartDate.Should().Be(new DateOnly(2026, 7, 5),
            because: "future weekly edits should use the newly selected task date as the rule anchor");
        futureTemplate.Pattern.DaysOfWeek.Should().Be((int)WeeklyDayFlags.Sunday,
            because: "moving a weekly task to Sunday should persist the new weekly day flag");
    }

    [Fact]
    public async Task Handle_DailyFutureEditMovesAnchorBeforeEffectiveDate_AllowsOverlappingSameSeriesOccurrences()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily review",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.FromHours(8)));

        // Act
        var futureRecurringTaskId = await _handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 7, 4),
            UserId = userId,
            Frequency = RecurrenceFrequency.Daily,
            Interval = 1,
            TaskDetails = BuildTaskDetails(
                "Daily review shifted",
                new DateTimeOffset(2026, 7, 2, 10, 0, 0, TimeSpan.FromHours(8)))
        }, CancellationToken.None);

        var oldTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var futureTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == futureRecurringTaskId);

        // Assert
        oldTemplate.EndDate.Should().Be(new DateOnly(2026, 7, 3),
            because: "future edits still split the old template at the selected effective occurrence");
        oldTemplate.IsActive.Should().BeTrue(
            because: "the old template still owns occurrences before the effective date");
        futureTemplate.StartDate.Should().Be(new DateOnly(2026, 7, 2),
            because: "the new future template is anchored to the user-selected task date");
        futureTemplate.SeriesId.Should().Be(oldTemplate.SeriesId,
            because: "the new template remains part of the same recurring series");
        _generatorService.IsOccurrenceOn(oldTemplate, new DateOnly(2026, 7, 2)).Should().BeTrue(
            because: "the old template keeps its original occurrence on the overlapping date");
        _generatorService.IsOccurrenceOn(futureTemplate, new DateOnly(2026, 7, 2)).Should().BeTrue(
            because: "the new template also begins on the overlapping date");
    }

    [Fact]
    public async Task Handle_DailyFutureEditMovesStartDate_UsesNewTaskDateAsAnchor()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily review",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 7, 4),
            templateStartTime: new DateTimeOffset(2026, 7, 4, 9, 0, 0, TimeSpan.FromHours(8)));

        // Act
        var futureRecurringTaskId = await _handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 7, 4),
            UserId = userId,
            Frequency = RecurrenceFrequency.Daily,
            Interval = 1,
            TaskDetails = BuildTaskDetails(
                "Daily review",
                new DateTimeOffset(2026, 7, 5, 9, 0, 0, TimeSpan.FromHours(8)))
        }, CancellationToken.None);

        var futureTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == futureRecurringTaskId);

        // Assert
        futureTemplate.StartDate.Should().Be(new DateOnly(2026, 7, 5),
            because: "daily future edits should allow the newly selected task date to become the future anchor");
        _generatorService.IsOccurrenceOn(futureTemplate, new DateOnly(2026, 7, 4)).Should().BeFalse(
            because: "the moved future daily rule should not generate an occurrence before its new anchor date");
        _generatorService.IsOccurrenceOn(futureTemplate, new DateOnly(2026, 7, 5)).Should().BeTrue(
            because: "the moved future daily rule should begin on the newly selected task date");
    }

    [Fact]
    public async Task Handle_FirstOccurrenceMovedBeforeEffectiveDate_UsesNewTaskDateAsAnchor()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily review",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 7, 4),
            templateStartTime: new DateTimeOffset(2026, 7, 4, 9, 0, 0, TimeSpan.FromHours(8)));

        // Act
        var futureRecurringTaskId = await _handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 7, 4),
            UserId = userId,
            Frequency = RecurrenceFrequency.Daily,
            Interval = 1,
            TaskDetails = BuildTaskDetails(
                "Daily review",
                new DateTimeOffset(2026, 7, 3, 9, 0, 0, TimeSpan.FromHours(8)))
        }, CancellationToken.None);

        var oldTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
        var futureTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == futureRecurringTaskId);

        // Assert
        oldTemplate.IsActive.Should().BeFalse(
            because: "moving the first occurrence before its original date should retire the original template");
        futureTemplate.StartDate.Should().Be(new DateOnly(2026, 7, 3),
            because: "the first occurrence of a newly created recurring task can be moved earlier without overlapping an earlier rule version");
    }

    [Fact]
    public async Task Handle_MonthlyFutureEditWithoutDayOfMonth_UsesNewTaskDateDay()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Pay rent",
            frequency: RecurrenceFrequency.Monthly,
            startDate: new DateOnly(2026, 7, 10),
            templateStartTime: new DateTimeOffset(2026, 7, 10, 9, 0, 0, TimeSpan.FromHours(8)));

        // Act
        var futureRecurringTaskId = await _handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 7, 10),
            UserId = userId,
            Frequency = RecurrenceFrequency.Monthly,
            Interval = 1,
            TaskDetails = BuildTaskDetails(
                "Pay rent",
                new DateTimeOffset(2026, 7, 15, 9, 0, 0, TimeSpan.FromHours(8)))
        }, CancellationToken.None);

        var futureTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == futureRecurringTaskId);

        // Assert
        futureTemplate.StartDate.Should().Be(new DateOnly(2026, 7, 15),
            because: "monthly future edits should anchor the new rule to the newly selected date");
        futureTemplate.Pattern.DayOfMonth.Should().Be(15,
            because: "monthly edits without an explicit day should default to the new task date day");
    }

    [Fact]
    public async Task Handle_YearlyFutureEditMovesStartDate_UsesNewTaskDateForYearlyRule()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Anniversary",
            frequency: RecurrenceFrequency.Yearly,
            startDate: new DateOnly(2026, 7, 4),
            templateStartTime: new DateTimeOffset(2026, 7, 4, 9, 0, 0, TimeSpan.FromHours(8)));

        // Act
        var futureRecurringTaskId = await _handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 7, 4),
            UserId = userId,
            Frequency = RecurrenceFrequency.Yearly,
            Interval = 1,
            TaskDetails = BuildTaskDetails(
                "Anniversary",
                new DateTimeOffset(2026, 7, 5, 9, 0, 0, TimeSpan.FromHours(8)))
        }, CancellationToken.None);

        var futureTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == futureRecurringTaskId);

        // Assert
        futureTemplate.StartDate.Should().Be(new DateOnly(2026, 7, 5),
            because: "yearly rules currently derive month and day from the template start date");
        _generatorService.IsOccurrenceOn(futureTemplate, new DateOnly(2027, 7, 5)).Should().BeTrue(
            because: "the moved yearly rule should repeat on the new month and day");
        _generatorService.IsOccurrenceOn(futureTemplate, new DateOnly(2027, 7, 4)).Should().BeFalse(
            because: "the moved yearly rule should no longer repeat on the old month and day");
    }

    [Fact]
    public async Task Handle_FutureEditWithEarlierAnchor_MigratesOnlyOverridesOnOrAfterEffectiveDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily review",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.FromHours(8)));

        var beforeEffectiveOverride = await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 7, 3),
            RecurringOccurrenceOverrideType.Materialized,
            _generatorService.CreateTaskItem(recurring, new DateOnly(2026, 7, 3)));

        var atEffectiveOverride = await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 7, 4),
            RecurringOccurrenceOverrideType.Materialized,
            _generatorService.CreateTaskItem(recurring, new DateOnly(2026, 7, 4)));

        // Act
        var futureRecurringTaskId = await _handler.Handle(new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = recurring.Id,
            EffectiveDate = new DateOnly(2026, 7, 4),
            UserId = userId,
            Frequency = RecurrenceFrequency.Daily,
            Interval = 1,
            TaskDetails = BuildTaskDetails(
                "Daily review shifted",
                new DateTimeOffset(2026, 7, 2, 10, 0, 0, TimeSpan.FromHours(8)))
        }, CancellationToken.None);

        var reloadedBefore = await _context.RecurringOccurrenceOverrides
            .SingleAsync(o => o.Id == beforeEffectiveOverride.Id);
        var reloadedAtEffective = await _context.RecurringOccurrenceOverrides
            .SingleAsync(o => o.Id == atEffectiveOverride.Id);

        // Assert
        reloadedBefore.RecurringTaskId.Should().Be(recurring.Id,
            because: "overrides before the effective date stay attached to the old template");
        reloadedAtEffective.RecurringTaskId.Should().Be(futureRecurringTaskId,
            because: "overrides on or after the effective date move to the future template");
    }

    private static EditTaskItemDto BuildTaskDetails(string title, DateTimeOffset startTime)
    {
        return new EditTaskItemDto
        {
            Title = title,
            StartTime = startTime,
            EndTime = startTime,
            TimeType = TaskTimeType.SingleTime,
            LabelId = null,
            NotificationId = null,
            AlertTime = null,
            IsDeadline = false
        };
    }
}

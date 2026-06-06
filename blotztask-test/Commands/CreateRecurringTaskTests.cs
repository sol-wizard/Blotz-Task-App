using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class CreateRecurringTaskTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly CreateRecurringTaskCommandHandler _handler;
    private readonly DataSeeder _seeder;

    public CreateRecurringTaskTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        var logger = TestDbContextFactory.CreateLogger<CreateRecurringTaskCommandHandler>();
        _handler = new CreateRecurringTaskCommandHandler(_context, logger);
    }

    [Fact]
    public async Task Handle_ValidDailyRecurringTask_CreatesRecurringTask()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var request = new CreateRecurringTaskRequest
        {
            Title = "  Daily Focus  ",
            Description = "  Deep work  ",
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = new DateTimeOffset(2026, 6, 2, 9, 0, 0, TimeSpan.Zero),
            Frequency = RecurrenceFrequency.Daily,
            Interval = 1,
            StartDate = new DateOnly(2026, 6, 2)
        };

        // Act
        var recurringTaskId = await _handler.Handle(new CreateRecurringTaskCommand
        {
            UserId = userId,
            TaskDetails = request
        });

        var recurringTask = await _context.RecurringTasks.SingleAsync(r => r.Id == recurringTaskId);

        // Assert
        recurringTask.UserId.Should().Be(userId, because: "created recurring tasks must belong to the current user");
        recurringTask.Title.Should().Be("Daily Focus", because: "titles should be trimmed before saving");
        recurringTask.Description.Should().Be("Deep work", because: "descriptions should be trimmed before saving");
        recurringTask.TemplateStartTime.Should().Be(request.TemplateStartTime, because: "the template start time defines generated occurrence times");
        recurringTask.TemplateEndTime.Should().BeNull(because: "single-time recurring tasks do not need a separate template end time");
        recurringTask.Pattern.Frequency.Should().Be(RecurrenceFrequency.Daily, because: "the saved pattern should match the request frequency");
        recurringTask.Pattern.Interval.Should().Be(1, because: "the saved pattern should match the request interval");
        recurringTask.IsActive.Should().BeTrue(because: "new recurring tasks should be active by default");
    }

    [Fact]
    public async Task Handle_ValidMonthlyRecurringTaskWithoutDayOfMonth_UsesStartDateDay()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var request = new CreateRecurringTaskRequest
        {
            Title = "Pay Rent",
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = new DateTimeOffset(2026, 6, 15, 9, 0, 0, TimeSpan.Zero),
            Frequency = RecurrenceFrequency.Monthly,
            Interval = 1,
            StartDate = new DateOnly(2026, 6, 15)
        };

        // Act
        var recurringTaskId = await _handler.Handle(new CreateRecurringTaskCommand
        {
            UserId = userId,
            TaskDetails = request
        });

        var recurringTask = await _context.RecurringTasks.SingleAsync(r => r.Id == recurringTaskId);

        // Assert
        recurringTask.Pattern.DayOfMonth.Should().Be(15,
            because: "monthly recurring tasks should default to the start date day when DayOfMonth is not provided");
    }

    [Fact]
    public async Task Handle_WeeklyRecurringTaskWithoutDaysOfWeek_ThrowsValidationException()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var request = new CreateRecurringTaskRequest
        {
            Title = "Weekly Planning",
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero),
            Frequency = RecurrenceFrequency.Weekly,
            Interval = 1,
            StartDate = new DateOnly(2026, 6, 1)
        };

        // Act
        var act = async () => await _handler.Handle(new CreateRecurringTaskCommand
        {
            UserId = userId,
            TaskDetails = request
        });

        // Assert
        await act.Should().ThrowAsync<ValidationException>(
            because: "weekly recurring tasks need at least one selected weekday");
    }

    [Fact]
    public async Task Handle_RangeTimeWithoutTemplateEndTime_ThrowsArgumentException()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var request = new CreateRecurringTaskRequest
        {
            Title = "Long Session",
            TimeType = TaskTimeType.RangeTime,
            TemplateStartTime = new DateTimeOffset(2026, 6, 2, 9, 0, 0, TimeSpan.Zero),
            Frequency = RecurrenceFrequency.Daily,
            Interval = 1,
            StartDate = new DateOnly(2026, 6, 2)
        };

        // Act
        var act = async () => await _handler.Handle(new CreateRecurringTaskCommand
        {
            UserId = userId,
            TaskDetails = request
        });

        // Assert
        await act.Should().ThrowAsync<ArgumentException>(
            because: "range-time recurring tasks need both template start and template end times");
    }
}

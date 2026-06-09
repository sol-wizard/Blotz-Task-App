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
            ScheduleTimeZoneId = "Australia/Perth",
            Frequency = RecurrenceFrequency.Daily,
            Interval = 1,
            StartDate = new DateOnly(2026, 6, 2)
        };

        // Act
        var result = await _handler.Handle(new CreateRecurringTaskCommand
        {
            UserId = userId,
            TaskDetails = request
        });

        var recurringTask = await _context.RecurringTasks.SingleAsync(r => r.Id == result.RecurringTaskId);
        var series = await _context.RecurringTaskSeries.SingleAsync(s => s.Id == result.SeriesId);

        // Assert
        series.UserId.Should().Be(userId, because: "creating a recurring task should create an owning series for future rule versions");
        recurringTask.SeriesId.Should().Be(series.Id, because: "the first recurring rule version must belong to the new series");
        recurringTask.UserId.Should().Be(userId, because: "created recurring tasks must belong to the current user");
        recurringTask.Title.Should().Be("Daily Focus", because: "titles should be trimmed before saving");
        recurringTask.Description.Should().Be("Deep work", because: "descriptions should be trimmed before saving");
        recurringTask.TemplateStartTime.Should().Be(request.TemplateStartTime, because: "the template start time defines generated occurrence times");
        recurringTask.TemplateEndTime.Should().BeNull(because: "single-time recurring tasks do not need a separate template end time");
        recurringTask.ScheduleTimeZoneId.Should().Be("Australia/Perth",
            because: "recurring occurrences should resolve future offsets from the schedule timezone");
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
            ScheduleTimeZoneId = "Australia/Perth",
            Frequency = RecurrenceFrequency.Monthly,
            Interval = 1,
            StartDate = new DateOnly(2026, 6, 15)
        };

        // Act
        var result = await _handler.Handle(new CreateRecurringTaskCommand
        {
            UserId = userId,
            TaskDetails = request
        });

        var recurringTask = await _context.RecurringTasks.SingleAsync(r => r.Id == result.RecurringTaskId);

        // Assert
        recurringTask.Pattern.DayOfMonth.Should().Be(15,
            because: "monthly recurring tasks should default to the start date day when DayOfMonth is not provided");
    }

    [Fact]
    public async Task Handle_RecurringTaskWithoutScheduleTimezone_ThrowsValidationException()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var request = new CreateRecurringTaskRequest
        {
            Title = "Daily Focus",
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = new DateTimeOffset(2026, 6, 2, 9, 0, 0, TimeSpan.Zero),
            ScheduleTimeZoneId = "  ",
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
        await act.Should().ThrowAsync<ValidationException>(
            because: "recurring schedule templates need a timezone id to generate future offsets correctly");
    }

    [Fact]
    public async Task Handle_RecurringTaskWithInvalidScheduleTimezone_ThrowsValidationException()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var request = new CreateRecurringTaskRequest
        {
            Title = "Daily Focus",
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = new DateTimeOffset(2026, 6, 2, 9, 0, 0, TimeSpan.Zero),
            ScheduleTimeZoneId = "Invalid/Timezone",
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
        await act.Should().ThrowAsync<ValidationException>(
            because: "recurring schedule templates should reject timezone ids that cannot resolve offsets");
    }

    [Fact]
    public async Task Handle_RecurringDeadlineTask_StoresRelativeDeadlineTemplate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var request = new CreateRecurringTaskRequest
        {
            Title = "Weekly Report",
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)),
            ScheduleTimeZoneId = "Australia/Perth",
            Frequency = RecurrenceFrequency.Weekly,
            Interval = 1,
            DaysOfWeek = (int)WeeklyDayFlags.Monday,
            StartDate = new DateOnly(2026, 6, 8),
            IsDeadline = true,
            TemplateDueAt = new DateTimeOffset(2026, 6, 10, 17, 0, 0, TimeSpan.FromHours(8)),
            DeadlineTimeZoneId = "Australia/Perth"
        };

        // Act
        var result = await _handler.Handle(new CreateRecurringTaskCommand
        {
            UserId = userId,
            TaskDetails = request
        });

        var recurringTask = await _context.RecurringTasks.SingleAsync(r => r.Id == result.RecurringTaskId);

        // Assert
        recurringTask.IsDeadline.Should().BeTrue(
            because: "marking a recurring task as deadline should make each occurrence a deadline occurrence");
        recurringTask.DeadlineOffsetDays.Should().Be(2,
            because: "the template stores the due date as a relative offset from the occurrence date");
        recurringTask.DeadlineTimeOfDay.Should().Be(new TimeOnly(17, 0),
            because: "the template stores the due local time independently from the first due date");
        recurringTask.DeadlineTimeZoneId.Should().Be("Australia/Perth",
            because: "future due offsets should be resolved from the deadline timezone instead of a fixed offset");
    }

    [Fact]
    public async Task Handle_RecurringDeadlineTaskWithoutTimezone_ThrowsValidationException()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var request = new CreateRecurringTaskRequest
        {
            Title = "Weekly Report",
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)),
            ScheduleTimeZoneId = "Australia/Perth",
            Frequency = RecurrenceFrequency.Weekly,
            Interval = 1,
            DaysOfWeek = (int)WeeklyDayFlags.Monday,
            StartDate = new DateOnly(2026, 6, 8),
            IsDeadline = true,
            TemplateDueAt = new DateTimeOffset(2026, 6, 10, 17, 0, 0, TimeSpan.FromHours(8))
        };

        // Act
        var act = async () => await _handler.Handle(new CreateRecurringTaskCommand
        {
            UserId = userId,
            TaskDetails = request
        });

        // Assert
        await act.Should().ThrowAsync<ValidationException>(
            because: "recurring deadline templates need a timezone id to generate future due offsets correctly");
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
            ScheduleTimeZoneId = "Australia/Perth",
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
            ScheduleTimeZoneId = "Australia/Perth",
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

    [Fact]
    public async Task Handle_TemplateStartTimeDateDoesNotMatchStartDate_ThrowsValidationException()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var request = new CreateRecurringTaskRequest
        {
            Title = "Daily Focus",
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero),
            ScheduleTimeZoneId = "Australia/Perth",
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
        await act.Should().ThrowAsync<ValidationException>(
            because: "recurring task templates should not save a date part that disagrees with the recurrence start date");
    }

    [Fact]
    public async Task Handle_RangeTemplateEndTimeDateDoesNotMatchStartDate_ThrowsValidationException()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var request = new CreateRecurringTaskRequest
        {
            Title = "Long Session",
            TimeType = TaskTimeType.RangeTime,
            TemplateStartTime = new DateTimeOffset(2026, 6, 2, 22, 0, 0, TimeSpan.Zero),
            TemplateEndTime = new DateTimeOffset(2026, 6, 3, 1, 0, 0, TimeSpan.Zero),
            ScheduleTimeZoneId = "Australia/Perth",
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
        await act.Should().ThrowAsync<ValidationException>(
            because: "range-time recurring task templates should keep their date part aligned with the recurrence start date");
    }
}

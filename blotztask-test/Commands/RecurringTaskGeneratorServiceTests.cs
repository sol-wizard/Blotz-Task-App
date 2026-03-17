using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using FluentAssertions;

namespace BlotzTask.Tests.Commands;

public class RecurringTaskGeneratorServiceTests
{
    private readonly RecurringTaskGeneratorService _service = new();

    // -----------------------------------------------------------------------
    // Daily recurrence
    // -----------------------------------------------------------------------

    [Fact]
    public void IsOccurrenceOn_DailyEveryDay_ShouldReturnTrue()
    {
        // "Take medication every day" starting Mar 1
        var task = MakeRecurringTask(RecurrenceFrequency.Daily, interval: 1, startDate: new DateOnly(2026, 3, 1));

        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 1)).Should().BeTrue();
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 4)).Should().BeTrue();
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 10)).Should().BeTrue();
    }

    [Fact]
    public void IsOccurrenceOn_DailyEveryTwoDays_ShouldReturnTrueOnIntervalDaysOnly()
    {
        // "Water the plants every 2 days" starting Mar 1 → Mar 1, 3, 5, 7 ...
        var task = MakeRecurringTask(RecurrenceFrequency.Daily, interval: 2, startDate: new DateOnly(2026, 3, 1));

        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 1)).Should().BeTrue("Mar 1 is the start");
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 3)).Should().BeTrue("Mar 3 is +2 days");
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 2)).Should().BeFalse("Mar 2 is skipped");
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 4)).Should().BeFalse("Mar 4 is skipped");
    }

    // -----------------------------------------------------------------------
    // Weekly recurrence
    // -----------------------------------------------------------------------

    [Fact]
    public void IsOccurrenceOn_WeeklyOnMonday_ShouldReturnTrueOnMondaysOnly()
    {
        // "Weekly standup every Monday" starting Mon Mar 2
        var task = MakeRecurringTask(RecurrenceFrequency.Weekly, interval: 1,
            daysOfWeek: (int)WeeklyDayFlags.Monday, startDate: new DateOnly(2026, 3, 2));

        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 2)).Should().BeTrue("Mar 2 is a Monday");
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 9)).Should().BeTrue("Mar 9 is a Monday");
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 3)).Should().BeFalse("Mar 3 is Tuesday");
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 8)).Should().BeFalse("Mar 8 is Sunday");
    }

    [Fact]
    public void IsOccurrenceOn_WeeklyOnMondayAndWednesday_ShouldReturnTrueOnBothDays()
    {
        // "Gym every Mon and Wed"
        var task = MakeRecurringTask(RecurrenceFrequency.Weekly, interval: 1,
            daysOfWeek: (int)(WeeklyDayFlags.Monday | WeeklyDayFlags.Wednesday),
            startDate: new DateOnly(2026, 3, 2));

        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 2)).Should().BeTrue("Monday");
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 4)).Should().BeTrue("Wednesday");
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 3)).Should().BeFalse("Tuesday");
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 5)).Should().BeFalse("Thursday");
    }

    // -----------------------------------------------------------------------
    // Monthly recurrence
    // -----------------------------------------------------------------------

    [Fact]
    public void IsOccurrenceOn_MonthlyOnThe15th_ShouldReturnTrueOn15thOnly()
    {
        // "Pay rent on the 15th of every month"
        var task = MakeRecurringTask(RecurrenceFrequency.Monthly, interval: 1,
            dayOfMonth: 15, startDate: new DateOnly(2026, 1, 15));

        _service.IsOccurrenceOn(task, new DateOnly(2026, 1, 15)).Should().BeTrue();
        _service.IsOccurrenceOn(task, new DateOnly(2026, 2, 15)).Should().BeTrue();
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 15)).Should().BeTrue();
        _service.IsOccurrenceOn(task, new DateOnly(2026, 1, 14)).Should().BeFalse();
        _service.IsOccurrenceOn(task, new DateOnly(2026, 1, 16)).Should().BeFalse();
    }

    // -----------------------------------------------------------------------
    // Yearly recurrence
    // -----------------------------------------------------------------------

    [Fact]
    public void IsOccurrenceOn_YearlyOnMar14_ShouldReturnTrueOnMar14EachYear()
    {
        // "Friend's birthday every Mar 14"
        var task = MakeRecurringTask(RecurrenceFrequency.Yearly, interval: 1,
            startDate: new DateOnly(2026, 3, 14));

        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 14)).Should().BeTrue();
        _service.IsOccurrenceOn(task, new DateOnly(2027, 3, 14)).Should().BeTrue();
        _service.IsOccurrenceOn(task, new DateOnly(2028, 3, 14)).Should().BeTrue();
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 13)).Should().BeFalse();
        _service.IsOccurrenceOn(task, new DateOnly(2026, 4, 14)).Should().BeFalse();
    }

    [Fact]
    public void IsOccurrenceOn_YearlyEveryTwoYears_ShouldSkipAlternateYears()
    {
        // "Biennial review every 2 years starting 2026"
        var task = MakeRecurringTask(RecurrenceFrequency.Yearly, interval: 2,
            startDate: new DateOnly(2026, 1, 1));

        _service.IsOccurrenceOn(task, new DateOnly(2026, 1, 1)).Should().BeTrue();
        _service.IsOccurrenceOn(task, new DateOnly(2028, 1, 1)).Should().BeTrue();
        _service.IsOccurrenceOn(task, new DateOnly(2027, 1, 1)).Should().BeFalse("2027 is skipped");
    }

    // -----------------------------------------------------------------------
    // Boundary / edge cases
    // -----------------------------------------------------------------------

    [Fact]
    public void IsOccurrenceOn_WhenDateIsBeforeTaskStartDate_ShouldReturnFalse()
    {
        var task = MakeRecurringTask(RecurrenceFrequency.Daily, interval: 1,
            startDate: new DateOnly(2026, 3, 5));

        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 1)).Should().BeFalse("before start date");
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 4)).Should().BeFalse("day before start");
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 5)).Should().BeTrue("start date itself");
    }

    [Fact]
    public void IsOccurrenceOn_WhenTaskHasEndDate_ShouldStillReturnTrueWithinRange()
    {
        // The EndDate guard is applied at query time (before IsOccurrenceOn is called),
        // but IsOccurrenceOn itself is date-agnostic — this test documents that behaviour.
        var task = MakeRecurringTask(RecurrenceFrequency.Daily, interval: 1,
            startDate: new DateOnly(2026, 3, 1), endDate: new DateOnly(2026, 3, 3));

        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 1)).Should().BeTrue();
        _service.IsOccurrenceOn(task, new DateOnly(2026, 3, 3)).Should().BeTrue();
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------

    private static RecurringTask MakeRecurringTask(
        RecurrenceFrequency frequency,
        int interval = 1,
        int? daysOfWeek = null,
        int? dayOfMonth = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        return new RecurringTask
        {
            Title = "Test Task",
            UserId = Guid.NewGuid(),
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = new DateTimeOffset(2026, 1, 1, 9, 0, 0, TimeSpan.Zero),
            StartDate = startDate ?? new DateOnly(2026, 1, 1),
            EndDate = endDate,
            IsActive = true,
            Pattern = new RecurrencePattern
            {
                Frequency = frequency,
                Interval = interval,
                DaysOfWeek = daysOfWeek,
                DayOfMonth = dayOfMonth,
            }
        };
    }
}

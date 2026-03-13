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
    public void GenerateInstances_DailyEveryDay_ShouldReturnAllDaysInRange()
    {
        // Real-world example: "Take medication every day"
        // Task starts Mar 1. Generate for Mar 1–5.
        // Expected: Mar 1, 2, 3, 4, 5 — all 5 days.

        // Arrange
        var recurringTask = MakeRecurringTask(
            frequency: RecurrenceFrequency.Daily,
            interval: 1,
            startDate: new DateOnly(2026, 3, 1));

        var from = new DateOnly(2026, 3, 1);
        var to   = new DateOnly(2026, 3, 5);

        // Act
        var result = _service.GenerateInstances(recurringTask, from, to);

        // Assert
        result.Should().HaveCount(5, because: "every day from Mar 1 to Mar 5 inclusive is a match");
        result.Select(t => DateOnly.FromDateTime(t.StartTime.Date))
              .Should().BeEquivalentTo([
                  new DateOnly(2026, 3, 1),
                  new DateOnly(2026, 3, 2),
                  new DateOnly(2026, 3, 3),
                  new DateOnly(2026, 3, 4),
                  new DateOnly(2026, 3, 5),
              ]);
    }

    [Fact]
    public void GenerateInstances_DailyEveryTwoDays_ShouldSkipAlternateDays()
    {
        // Real-world example: "Water the plants every 2 days"
        // Task starts Mar 1 (interval=2). Generate for Mar 1–7.
        // Expected: Mar 1, 3, 5, 7 — every other day.

        // Arrange
        var recurringTask = MakeRecurringTask(
            frequency: RecurrenceFrequency.Daily,
            interval: 2,
            startDate: new DateOnly(2026, 3, 1));

        var from = new DateOnly(2026, 3, 1);
        var to   = new DateOnly(2026, 3, 7);

        // Act
        var result = _service.GenerateInstances(recurringTask, from, to);

        // Assert
        result.Should().HaveCount(4, because: "with interval=2 starting Mar 1, matches are Mar 1, 3, 5, 7");
        result.Select(t => DateOnly.FromDateTime(t.StartTime.Date))
              .Should().BeEquivalentTo([
                  new DateOnly(2026, 3, 1),
                  new DateOnly(2026, 3, 3),
                  new DateOnly(2026, 3, 5),
                  new DateOnly(2026, 3, 7),
              ]);
    }

    // -----------------------------------------------------------------------
    // Weekly recurrence
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateInstances_WeeklyOnMonday_ShouldReturnOnlyMondays()
    {
        // Real-world example: "Weekly team standup every Monday"
        // Task starts Mon Mar 2. Generate for Mar 2–22.
        // Expected: Mar 2, 9, 16 — only Mondays.

        // Arrange
        var recurringTask = MakeRecurringTask(
            frequency: RecurrenceFrequency.Weekly,
            interval: 1,
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            startDate: new DateOnly(2026, 3, 2));

        var from = new DateOnly(2026, 3, 2);
        var to   = new DateOnly(2026, 3, 22);

        // Act
        var result = _service.GenerateInstances(recurringTask, from, to);

        // Assert
        result.Should().HaveCount(3, because: "Mondays in range: Mar 2, 9, 16");
        result.All(t => t.StartTime.DayOfWeek == DayOfWeek.Monday)
              .Should().BeTrue(because: "only Mondays should be generated");
    }

    [Fact]
    public void GenerateInstances_WeeklyOnMondayAndWednesday_ShouldReturnBothDays()
    {
        // Real-world example: "Gym session every Monday and Wednesday"
        // Task starts Mon Mar 2. Generate for Mar 2–8 (one week only).
        // Expected: Mar 2 (Mon) and Mar 4 (Wed) — two sessions that week.

        // Arrange
        var recurringTask = MakeRecurringTask(
            frequency: RecurrenceFrequency.Weekly,
            interval: 1,
            daysOfWeek: (int)(WeeklyDayFlags.Monday | WeeklyDayFlags.Wednesday),
            startDate: new DateOnly(2026, 3, 2));

        var from = new DateOnly(2026, 3, 2);
        var to   = new DateOnly(2026, 3, 8);

        // Act
        var result = _service.GenerateInstances(recurringTask, from, to);

        // Assert
        result.Should().HaveCount(2, because: "in the week of Mar 2–8, only Mon Mar 2 and Wed Mar 4 match");
        result.Select(t => t.StartTime.DayOfWeek)
              .Should().BeEquivalentTo([DayOfWeek.Monday, DayOfWeek.Wednesday]);
    }

    // -----------------------------------------------------------------------
    // Monthly recurrence
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateInstances_MonthlyOnThe15th_ShouldReturnOnly15thOfEachMonth()
    {
        // Real-world example: "Pay rent on the 15th of every month"
        // Task starts Jan 15. Generate for Jan 1–Mar 31.
        // Expected: Jan 15, Feb 15, Mar 15 — one per month.

        // Arrange
        var recurringTask = MakeRecurringTask(
            frequency: RecurrenceFrequency.Monthly,
            interval: 1,
            dayOfMonth: 15,
            startDate: new DateOnly(2026, 1, 15));

        var from = new DateOnly(2026, 1, 1);
        var to   = new DateOnly(2026, 3, 31);

        // Act
        var result = _service.GenerateInstances(recurringTask, from, to);

        // Assert
        result.Should().HaveCount(3, because: "the 15th falls in Jan, Feb, Mar within the range");
        result.Select(t => DateOnly.FromDateTime(t.StartTime.Date))
              .Should().BeEquivalentTo([
                  new DateOnly(2026, 1, 15),
                  new DateOnly(2026, 2, 15),
                  new DateOnly(2026, 3, 15),
              ]);
    }

    // -----------------------------------------------------------------------
    // Boundary / edge cases
    // -----------------------------------------------------------------------

    [Fact]
    public void GenerateInstances_WhenFromIsBeforeTaskStartDate_ShouldClampToStartDate()
    {
        // Real-world example: "Daily morning run — user created it Mar 5, but the generator
        // window starts Mar 1. No runs should appear before Mar 5."
        // Expected: Mar 5, 6, 7 only — nothing before the task's own start date.

        // Arrange
        var recurringTask = MakeRecurringTask(
            frequency: RecurrenceFrequency.Daily,
            interval: 1,
            startDate: new DateOnly(2026, 3, 5));

        var from = new DateOnly(2026, 3, 1);
        var to   = new DateOnly(2026, 3, 7);

        // Act
        var result = _service.GenerateInstances(recurringTask, from, to);

        // Assert
        result.Should().HaveCount(3, because: "instances should only start from Mar 5, not Mar 1");
        result.All(t => DateOnly.FromDateTime(t.StartTime.Date) >= new DateOnly(2026, 3, 5))
              .Should().BeTrue(because: "no TaskItem should be generated before the task's StartDate");
    }

    [Fact]
    public void GenerateInstances_WhenTaskHasEndDateInsideWindow_ShouldStopAtEndDate()
    {
        // Real-world example: "Daily check-in during a 3-day workshop (Mar 1–3).
        // Generator window goes to Mar 7, but the task ends Mar 3."
        // Expected: Mar 1, 2, 3 only — nothing after the task's end date.

        // Arrange
        var recurringTask = MakeRecurringTask(
            frequency: RecurrenceFrequency.Daily,
            interval: 1,
            startDate: new DateOnly(2026, 3, 1),
            endDate: new DateOnly(2026, 3, 3));

        var from = new DateOnly(2026, 3, 1);
        var to   = new DateOnly(2026, 3, 7);

        // Act
        var result = _service.GenerateInstances(recurringTask, from, to);

        // Assert
        result.Should().HaveCount(3, because: "task ends Mar 3, so only Mar 1, 2, 3 are generated");
        result.All(t => DateOnly.FromDateTime(t.StartTime.Date) <= new DateOnly(2026, 3, 3))
              .Should().BeTrue(because: "no TaskItem should be generated after the task's EndDate");
    }

    [Fact]
    public void GenerateInstances_WhenWindowIsEntirelyBeforeTaskStartDate_ShouldReturnEmpty()
    {
        // Real-world example: "Quarterly review starts Apr 1, but the generator is
        // asked to fill March. There's nothing to generate yet."
        // Expected: empty list.

        // Arrange
        var recurringTask = MakeRecurringTask(
            frequency: RecurrenceFrequency.Daily,
            interval: 1,
            startDate: new DateOnly(2026, 4, 1));

        var from = new DateOnly(2026, 3, 1);
        var to   = new DateOnly(2026, 3, 31);

        // Act
        var result = _service.GenerateInstances(recurringTask, from, to);

        // Assert
        result.Should().BeEmpty(because: "the entire window is before the task's StartDate");
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

using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetTasksByDateTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly GetTasksByDateQueryHandler _handler;
    private readonly DataSeeder _seeder;

    public GetTasksByDateTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        var logger = TestDbContextFactory.CreateLogger<GetTasksByDateQueryHandler>();
        _handler = new GetTasksByDateQueryHandler(_context, new(), logger);
    }

    [Fact]
    public async Task Handle_ShouldReturnTasks_OnlyIfTheyFallWithinTheSelectedDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();

        // Simulate a user in UTC+8 selecting "2024-11-21".
        // Their "Start of Day" is 2024-11-21 00:00:00 +08:00 -> 2024-11-20 16:00:00 UTC.
        // Window: Nov 20 16:00 UTC -> Nov 21 16:00 UTC
        var dayStartUtc = new DateTimeOffset(2024, 11, 20, 16, 0, 0, TimeSpan.Zero);

        // 1. Task Inside Window: Clearly inside
        await _seeder.CreateTaskAsync(userId, "Task Inside Window", dayStartUtc.AddHours(2), dayStartUtc.AddHours(3));

        // 2. Task Spanning Window: Starts before, ends inside
        await _seeder.CreateTaskAsync(userId, "Task Spanning Window", dayStartUtc.AddHours(-1), dayStartUtc.AddHours(1));

        // 3. Boundary Edge Case (START): Task ends EXACTLY when the window starts
        // Logic: t.EndTime >= selectedDayStart — currently INCLUDED.
        await _seeder.CreateTaskAsync(userId, "Task Ending At Start", dayStartUtc.AddHours(-1), dayStartUtc);

        // 4. Boundary Edge Case (END): Task starts EXACTLY when the window ends
        // Logic: t.StartTime < selectedDayEnd — currently EXCLUDED.
        await _seeder.CreateTaskAsync(userId, "Task Starting At End", dayStartUtc.AddDays(1), dayStartUtc.AddDays(1).AddHours(1));

        // 5. Task Outside (Before): Ends well before start
        await _seeder.CreateTaskAsync(userId, "Task Outside (Before)", dayStartUtc.AddHours(-5), dayStartUtc.AddHours(-4));

        // 6. Task Outside (After): Starts well after end
        await _seeder.CreateTaskAsync(userId, "Task Outside (After)", dayStartUtc.AddDays(1).AddHours(1), dayStartUtc.AddDays(1).AddHours(2));

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2024, 11, 21),
            TimeZoneId = "Asia/Shanghai"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().Contain(t => t.Title == "Task Inside Window",
            because: "tasks fully inside the 24-hour window must be returned");

        result.Should().Contain(t => t.Title == "Task Spanning Window",
            because: "tasks that start before and end inside the window must be returned");

        result.Should().Contain(t => t.Title == "Task Ending At Start",
            because: "tasks ending exactly at the start boundary (>= selectedDayStart) must be included");

        result.Should().NotContain(t => t.Title == "Task Starting At End",
            because: "tasks starting exactly at the end boundary (< selectedDayEnd) must be excluded — they belong to the next day");

        result.Should().NotContain(t => t.Title == "Task Outside (Before)",
            because: "tasks ending before the window starts must be excluded");

        result.Should().NotContain(t => t.Title == "Task Outside (After)",
            because: "tasks starting after the window ends must be excluded");
    }

    [Fact]
    public async Task Handle_DifferentTimezones_ShouldShowTaskOnCorrectLocalDay()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();

        // A global meeting at 11:30 PM UTC on Nov 20 falls on different calendar days for different users.
        var meetingUtc = new DateTimeOffset(2024, 11, 20, 23, 30, 0, TimeSpan.Zero);
        await _seeder.CreateTaskAsync(userId, "Global Meeting", meetingUtc, meetingUtc.AddMinutes(30));

        // London (UTC+0) on Nov 20: window is Nov 20 00:00 UTC → Nov 21 00:00 UTC.
        // Meeting at 23:30 UTC is inside the window.
        var londonQuery = new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2024, 11, 20),
            TimeZoneId = "Europe/London"
        };

        // Paris (UTC+1) on Nov 20: window is Nov 19 23:00 UTC → Nov 20 23:00 UTC.
        // Meeting at 23:30 UTC falls outside that window — it's already Nov 21 in Paris.
        var parisQuery = new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2024, 11, 20),
            TimeZoneId = "Europe/Paris"
        };

        // Act
        var londonResult = await _handler.Handle(londonQuery);
        var parisResult = await _handler.Handle(parisQuery);

        // Assert
        londonResult.Should().Contain(t => t.Title == "Global Meeting",
            because: "London (UTC+0) is still on Nov 20 at 23:30 UTC — the meeting falls within their day");

        parisResult.Should().NotContain(t => t.Title == "Global Meeting",
            because: "Paris (UTC+1) has crossed into Nov 21 at 23:30 UTC — the meeting is outside their Nov 20 window");
    }

    [Fact]
    public async Task Handle_DST_SpringForward_TaskJustAfterDstMidnight_ShouldNotAppearOnSpringForwardDay()
    {
        // On 2026-10-04 Australia/Sydney springs forward: clocks jump from 2am AEST to 3am AEDT.
        // That day is only 23 hours long. Its UTC window is:
        //   start: 2026-10-03 14:00 UTC  (midnight AEST, UTC+10)
        //   end:   2026-10-04 13:00 UTC  (midnight AEDT, UTC+11 — 23 hours later, not 24)
        // A naive AddDays(1) would set the window end to 14:00 UTC, wrongly including tasks in the first hour of Oct 5.

        // Arrange
        var userId = await _seeder.CreateUserAsync();

        // 13:30 UTC on Oct 4 = 00:30 AEDT on Oct 5 — just after the DST-aware midnight
        var justAfterDstMidnight = new DateTimeOffset(2026, 10, 4, 13, 30, 0, TimeSpan.Zero);
        await _seeder.CreateTaskAsync(userId, "DST Boundary Task", justAfterDstMidnight, justAfterDstMidnight.AddHours(1));

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2026, 10, 4),
            TimeZoneId = "Australia/Sydney"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().NotContain(t => t.Title == "DST Boundary Task",
            because: "13:30 UTC on Oct 4 is 00:30 AEDT on Oct 5 — past the DST-aware midnight, so it belongs to Oct 5, not Oct 4");
    }

    [Fact]
    public async Task Handle_ShouldIncludeOverdueTasks_OnlyForToday_NotForPastOrFutureDates()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();

        _context.UserPreferences.Add(new UserPreference { UserId = userId, AutoRollover = true });
        await _context.SaveChangesAsync();

        var todayUtc = DateOnly.FromDateTime(DateTime.UtcNow);

        var nineDaysAgo = DateTime.UtcNow.Date.AddDays(-9);
        await _seeder.CreateTaskAsync(
            userId,
            "Old Overdue Task",
            new DateTimeOffset(nineDaysAgo.AddHours(9), TimeSpan.Zero),
            new DateTimeOffset(nineDaysAgo.AddHours(10), TimeSpan.Zero));

        var twoDaysAgo = DateTime.UtcNow.Date.AddDays(-2);
        var completedTask = await _seeder.CreateTaskAsync(
            userId,
            "Completed Overdue Task",
            new DateTimeOffset(twoDaysAgo.AddHours(11), TimeSpan.Zero),
            new DateTimeOffset(twoDaysAgo.AddHours(12), TimeSpan.Zero));
        completedTask.IsDone = true;
        await _context.SaveChangesAsync();

        var twoDaysFromNow = DateTime.UtcNow.Date.AddDays(2);
        await _seeder.CreateTaskAsync(
            userId,
            "Future Scheduled Task",
            new DateTimeOffset(twoDaysFromNow.AddHours(14), TimeSpan.Zero),
            new DateTimeOffset(twoDaysFromNow.AddHours(15), TimeSpan.Zero));

        var todayQuery = new GetTasksByDateQuery { UserId = userId, Date = todayUtc, TimeZoneId = "UTC" };
        var pastQuery = new GetTasksByDateQuery { UserId = userId, Date = todayUtc.AddDays(-3), TimeZoneId = "UTC" };
        var futureQuery = new GetTasksByDateQuery { UserId = userId, Date = todayUtc.AddDays(2), TimeZoneId = "UTC" };

        // Act
        var todayResult = await _handler.Handle(todayQuery);
        var pastResult = await _handler.Handle(pastQuery);
        var futureResult = await _handler.Handle(futureQuery);

        // Assert
        todayResult.Should().Contain(t => t.Title == "Old Overdue Task",
            because: "today's view should surface all incomplete overdue tasks regardless of how old they are");
        todayResult.Should().NotContain(t => t.Title == "Completed Overdue Task",
            because: "completed overdue tasks should not roll over");

        pastResult.Should().NotContain(t => t.Title == "Old Overdue Task",
            because: "overdue tasks are only surfaced on today's view, not on past day views");

        futureResult.Should().Contain(t => t.Title == "Future Scheduled Task",
            because: "future day views should still show tasks scheduled in that period");
        futureResult.Should().NotContain(t => t.Title == "Old Overdue Task",
            because: "future day views must not show overdue tasks from the past");
    }

    // -----------------------------------------------------------------------
    // Virtual recurring occurrence tests
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Handle_ShouldReturnVirtualOccurrence_WhenRecurringTaskOccursOnDate()
    {
        // Scenario: User sets up "Go to Gym" as a daily recurring task starting Mar 14 at 9am.
        // They haven't opened the app yet today so no DB row exists for today.
        // Expected: "Go to Gym" still shows up on Mar 14 as a virtual task (Id = null).
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 3, 14, 9, 0, 0, TimeSpan.Zero);

        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Go to Gym",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 3, 14),
            templateStartTime: templateTime);

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2026, 3, 14),
            TimeZoneId = "UTC"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert: "Go to Gym" appears but has no DB row yet (Id = null), only the template reference
        var virtualTask = result.Should().ContainSingle(t => t.Title == "Go to Gym").Subject;
        virtualTask.Id.Should().BeNull(because: "user has not interacted with today's occurrence yet — no DB row saved");
        virtualTask.OccurrenceKind.Should().Be(TaskOccurrenceKind.VirtualRecurringOccurrence,
            because: "the API should explicitly identify virtual recurring occurrences instead of requiring clients to infer that from a null id");
        virtualTask.RecurringOccurrence.Should().NotBeNull(
            because: "virtual recurring occurrences must expose a complete recurring occurrence identity");
        virtualTask.RecurringOccurrence!.RecurringTaskId.Should().BeGreaterThan(0,
            because: "the nested identity should include the recurring template id");
        virtualTask.RecurringOccurrence.OccurrenceDate.Should().Be(new DateOnly(2026, 3, 14),
            because: "the nested identity should carry the stable occurrence date used for materialization");
    }

    [Fact]
    public async Task Handle_OvernightRecurringOccurrence_ShouldAppearOnFollowingDayWithOriginalOccurrenceDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var templateStart = new DateTimeOffset(2026, 6, 1, 22, 0, 0, TimeSpan.Zero);
        var templateEnd = new DateTimeOffset(2026, 6, 2, 1, 0, 0, TimeSpan.Zero);

        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Night Shift",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: templateStart,
            templateEndTime: templateEnd,
            scheduleTimeZoneId: "UTC");

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2026, 6, 2),
            TimeZoneId = "UTC"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        var overnightContinuation = result.SingleOrDefault(t =>
            t.Title == "Night Shift"
            && t.RecurringOccurrence != null
            && t.RecurringOccurrence.OccurrenceDate == new DateOnly(2026, 6, 1));
        overnightContinuation.Should().NotBeNull(
            because: "the following-day view should include the previous night's recurring occurrence");
        overnightContinuation!.StartTime.Should().Be(templateStart,
            because: "the following-day view should show the occurrence that started the previous night");
        overnightContinuation.EndTime.Should().Be(templateEnd,
            because: "the following-day view should keep the actual overnight end time");
        overnightContinuation.RecurringOccurrence!.OccurrenceDate.Should().Be(new DateOnly(2026, 6, 1),
            because: "editing or deleting the continuation must target the original recurrence date");
    }

    [Fact]
    public async Task Handle_ShouldReturnStoredRow_NotVirtual_WhenOccurrenceAlreadySaved()
    {
        // Scenario: User has "Morning Run" as a daily recurring task.
        // They already marked today's run as done — a real DB row now exists for today.
        // Expected: only 1 "Morning Run" appears (the saved row), not 2 (saved + virtual duplicate).
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 3, 14, 9, 0, 0, TimeSpan.Zero);

        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Morning Run",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 3, 14),
            templateStartTime: templateTime);

        var savedOccurrence = await _seeder.CreateTaskAsync(userId, "Morning Run", templateTime, templateTime);
        savedOccurrence.IsDone = true;
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 3, 14),
            RecurringOccurrenceOverrideType.Materialized,
            savedOccurrence);

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2026, 3, 14),
            TimeZoneId = "UTC"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert: exactly 1 "Morning Run", with a real Id and marked done — no virtual duplicate
        var taskResults = result.Where(t => t.Title == "Morning Run").ToList();
        taskResults.Should().HaveCount(1, because: "the saved DB row replaces the virtual occurrence — user should not see duplicates");
        taskResults[0].Id.Should().NotBeNull(because: "this is the real saved row, not a virtual one");
        taskResults[0].OccurrenceKind.Should().Be(TaskOccurrenceKind.MaterializedRecurringOccurrence,
            because: "stored recurring task items should be identified as materialized recurring occurrences");
        taskResults[0].IsDone.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_NormalTask_ShouldReturnNormalTaskOccurrenceKind()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var taskStart = new DateTimeOffset(2026, 3, 14, 9, 0, 0, TimeSpan.Zero);
        await _seeder.CreateTaskAsync(userId, "One-off task", taskStart, taskStart.AddHours(1));

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2026, 3, 14),
            TimeZoneId = "UTC"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        var task = result.Should().ContainSingle(t => t.Title == "One-off task").Subject;
        task.OccurrenceKind.Should().Be(TaskOccurrenceKind.NormalTaskItem,
            because: "ordinary persisted tasks should be explicitly distinguished from recurring occurrences");
        task.RecurringOccurrence.Should().BeNull(
            because: "ordinary persisted tasks do not have a recurring occurrence identity");
    }

    [Fact]
    public async Task Handle_MaterializedOccurrenceMovedToAnotherDate_ShouldNotReturnDuplicateVirtualOccurrence()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var originalOccurrenceDate = new DateOnly(2026, 3, 14);
        var templateTime = new DateTimeOffset(2026, 3, 14, 9, 0, 0, TimeSpan.Zero);
        var movedStart = new DateTimeOffset(2026, 3, 15, 15, 0, 0, TimeSpan.Zero);

        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Moved Workout",
            frequency: RecurrenceFrequency.Daily,
            startDate: originalOccurrenceDate,
            templateStartTime: templateTime);

        var movedOccurrence = await _seeder.CreateTaskAsync(userId, "Moved Workout", movedStart, movedStart);
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            originalOccurrenceDate,
            RecurringOccurrenceOverrideType.Modified,
            movedOccurrence);

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            Date = originalOccurrenceDate,
            TimeZoneId = "UTC"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().NotContain(t => t.Title == "Moved Workout",
            because: "the original occurrence date already has a materialized task even if that task was rescheduled to another calendar day");
    }

    [Fact]
    public async Task Handle_WeeklyRecurring_ShouldAppearOnCorrectDay_AndNotOnWrongDay()
    {
        // Scenario: User sets up "Monday Yoga" every Monday at 7am starting Mar 16 2026.
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 3, 16, 7, 0, 0, TimeSpan.Zero);

        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Monday Yoga",
            frequency: RecurrenceFrequency.Weekly,
            startDate: new DateOnly(2026, 3, 16),
            templateStartTime: templateTime,
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            scheduleTimeZoneId: "UTC");

        var mondayQuery = new GetTasksByDateQuery { UserId = userId, Date = new DateOnly(2026, 3, 16), TimeZoneId = "UTC" };
        var tuesdayQuery = new GetTasksByDateQuery { UserId = userId, Date = new DateOnly(2026, 3, 17), TimeZoneId = "UTC" };

        var mondayResult = await _handler.Handle(mondayQuery);
        var tuesdayResult = await _handler.Handle(tuesdayQuery);

        mondayResult.Should().Contain(t => t.Title == "Monday Yoga",
            because: "Mar 16 2026 is a Monday — yoga should appear");
        tuesdayResult.Should().NotContain(t => t.Title == "Monday Yoga",
            because: "Mar 17 2026 is a Tuesday — yoga is Monday-only");
    }

    [Fact]
    public async Task Handle_MonthlyRecurring_ShouldAppearOnCorrectDay_AndNotOnWrongDay()
    {
        // Scenario: User sets up "Pay Rent" on the 1st of every month starting Jan 1 2026.
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2026, 1, 1, 9, 0, 0, TimeSpan.Zero);

        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Pay Rent",
            frequency: RecurrenceFrequency.Monthly,
            startDate: new DateOnly(2026, 1, 1),
            templateStartTime: templateTime,
            scheduleTimeZoneId: "UTC");

        var march1Query = new GetTasksByDateQuery { UserId = userId, Date = new DateOnly(2026, 3, 1), TimeZoneId = "UTC" };
        var march2Query = new GetTasksByDateQuery { UserId = userId, Date = new DateOnly(2026, 3, 2), TimeZoneId = "UTC" };

        var march1Result = await _handler.Handle(march1Query);
        var march2Result = await _handler.Handle(march2Query);

        march1Result.Should().Contain(t => t.Title == "Pay Rent",
            because: "Mar 1 is the 1st of the month — monthly rent reminder should appear");
        march2Result.Should().NotContain(t => t.Title == "Pay Rent",
            because: "Mar 2 is not the 1st of the month — rent reminder should not appear");
    }

    [Fact]
    public async Task Handle_YearlyRecurring_ShouldAppearOnCorrectDay_AndNotOnWrongDay()
    {
        // Scenario: User sets up "Annual Health Checkup" every year starting Mar 14 2025.
        var userId = await _seeder.CreateUserAsync();
        var templateTime = new DateTimeOffset(2025, 3, 14, 10, 0, 0, TimeSpan.Zero);

        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Annual Health Checkup",
            frequency: RecurrenceFrequency.Yearly,
            startDate: new DateOnly(2025, 3, 14),
            templateStartTime: templateTime,
            scheduleTimeZoneId: "UTC");

        var anniversaryQuery = new GetTasksByDateQuery { UserId = userId, Date = new DateOnly(2026, 3, 14), TimeZoneId = "UTC" };
        var dayAfterQuery = new GetTasksByDateQuery { UserId = userId, Date = new DateOnly(2026, 3, 15), TimeZoneId = "UTC" };

        var anniversaryResult = await _handler.Handle(anniversaryQuery);
        var dayAfterResult = await _handler.Handle(dayAfterQuery);

        anniversaryResult.Should().Contain(t => t.Title == "Annual Health Checkup",
            because: "Mar 14 2026 is exactly one year after Mar 14 2025 — yearly checkup should appear");
        dayAfterResult.Should().NotContain(t => t.Title == "Annual Health Checkup",
            because: "Mar 15 2026 is not the anniversary date — checkup should not appear");
    }
}

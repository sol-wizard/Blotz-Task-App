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
        
        // Simulate a user in UTC+8 selecting "2024-11-21"
        // Their "Start of Day" is 2024-11-21 00:00:00 +08:00 -> 2024-11-20 16:00:00 UTC
        var clientStartDate = new DateTime(2024, 11, 20, 16, 0, 0, DateTimeKind.Utc);
        
        // The API calculates the window as: [clientStartDateUtc] to [clientStartDateUtc + 1 Day]
        // Window: Nov 20 16:00 UTC -> Nov 21 16:00 UTC

        // 1. Task Inside Window: Clearly inside
        await _seeder.CreateTaskAsync(userId, "Task Inside Window", clientStartDate.AddHours(2), clientStartDate.AddHours(3));
        
        // 2. Task Spanning Window: Starts before, ends inside
        await _seeder.CreateTaskAsync(userId, "Task Spanning Window", clientStartDate.AddHours(-1), clientStartDate.AddHours(1));
        
        // 3. Boundary Edge Case (START): Task ends EXACTLY when the window starts
        // Logic: t.EndTime >= query.StartDateUtc
        // This task belongs to the PREVIOUS day but touches the boundary. 
        // Currently INCLUDED due to >= logic.
        await _seeder.CreateTaskAsync(userId, "Task Ending At Start", clientStartDate.AddHours(-1), clientStartDate);

        // 4. Boundary Edge Case (END): Task starts EXACTLY when the window ends
        // Logic: t.StartTime < endDateUtc
        // This task belongs to the NEXT day.
        // Currently EXCLUDED due to < logic.
        await _seeder.CreateTaskAsync(userId, "Task Starting At End", clientStartDate.AddDays(1), clientStartDate.AddDays(1).AddHours(1));

        // 5. Task Outside (Before): Ends well before start
        await _seeder.CreateTaskAsync(userId, "Task Outside (Before)", clientStartDate.AddHours(-5), clientStartDate.AddHours(-4));
        
        // 6. Task Outside (After): Starts well after end
        await _seeder.CreateTaskAsync(userId, "Task Outside (After)", clientStartDate.AddDays(1).AddHours(1), clientStartDate.AddDays(1).AddHours(2));
        

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDate = clientStartDate,
            IncludeFloatingForToday = true
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().Contain(t => t.Title == "Task Inside Window", 
            because: "Tasks fully inside the 24-hour window MUST be returned");
            
        result.Should().Contain(t => t.Title == "Task Spanning Window", 
            because: "Tasks that start before and end inside the window MUST be returned");
        
        // Boundary assertions
        result.Should().Contain(t => t.Title == "Task Ending At Start", 
            because: "Tasks ending exactly at the start boundary (>= StartDate) MUST be INCLUDED");
            
        result.Should().NotContain(t => t.Title == "Task Starting At End", 
            because: "Tasks starting exactly at the end boundary (< EndDate) MUST be EXCLUDED (they belong to the next day)");

        // Outside assertions
        result.Should().NotContain(t => t.Title == "Task Outside (Before)", 
            because: "Tasks ending before the window starts MUST be excluded");
            
        result.Should().NotContain(t => t.Title == "Task Outside (After)", 
            because: "Tasks starting after the window ends MUST be excluded");

        // Floating task assertion (calendar page should NOT show floating tasks)
        result.Should().NotContain(t => t.Title == "Floating Task (No Time)", 
            because: "Floating tasks (no start/end time) should NOT appear on the calendar page - they will be shown in a separate Reminder UI");
    }

    [Fact]
    public async Task Handle_DifferentTimezones_ShouldShowTaskOnCorrectLocalDay()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();

        // Scenario: A Global Meeting at 11:30 PM UTC (Nov 20)
        // This single moment in time falls on DIFFERENT calendar days for different users.
        var boundaryTaskTimeUtc = new DateTimeOffset(2024, 11, 20, 23, 30, 0, TimeSpan.Zero);
        await _seeder.CreateTaskAsync(userId, "Global Meeting (11:30 PM UTC)", boundaryTaskTimeUtc, boundaryTaskTimeUtc.AddMinutes(30));

        // --- LONDON USER (UTC+0) ---
        // Local Time: Nov 20, 11:30 PM.
        // The meeting IS today for them.
        var londonRequestDateUtc = new DateTime(2024, 11, 20, 0, 0, 0, DateTimeKind.Utc);
        var londonQuery = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDate = londonRequestDateUtc,
            IncludeFloatingForToday = false
        };

        // --- PARIS USER (UTC+1) ---
        // Local Time: Nov 21, 00:30 AM.
        // The meeting was YESTERDAY (or technically 'today' if querying Nov 21).
        // When querying for "Nov 20", they should NOT see it because for them, Nov 20 ended at 23:00 UTC.
        var parisRequestDateUtc = new DateTime(2024, 11, 19, 23, 0, 0, DateTimeKind.Utc); // Nov 20 Midnight in Paris is Nov 19 23:00 UTC
        var parisQuery = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDate = parisRequestDateUtc,
            IncludeFloatingForToday = false
        };

        // Act
        var londonResult = await _handler.Handle(londonQuery);
        var parisResult = await _handler.Handle(parisQuery);

        // Assert
        londonResult.Should().Contain(t => t.Title == "Global Meeting (11:30 PM UTC)", 
            because: "London user (UTC+0) is still in Nov 20 at 11:30 PM, so they should see the task.");

        parisResult.Should().NotContain(t => t.Title == "Global Meeting (11:30 PM UTC)", 
            because: "Paris user (UTC+1) has already crossed into Nov 21 (it's 12:30 AM local), so they should NOT see this task on their 'Nov 20' view.");
    }
    

    [Fact]
    public async Task Handle_ShouldShowOverdueTask_WithinSevenDayWindow()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        
        // Create UserPreferences with AutoRollover enabled (required for overdue task rollover)
        _context.UserPreferences.Add(new UserPreference { UserId = userId, AutoRollover = true });
        await _context.SaveChangesAsync();
        
        // Use current time with local timezone to properly test overdue rollover
        var userNow = DateTimeOffset.Now;
        var localOffset = userNow.Offset;
        var userTodayStart = new DateTimeOffset(userNow.Date, localOffset);
        var threeDaysAgo = userNow.AddDays(-3);
        
        // 1. Overdue task within 7-day window (ended 2 days ago, NOT done) -> SHOULD appear
        var fourDaysAgo = userTodayStart.AddDays(-4);
        await _seeder.CreateTaskAsync(userId, "Overdue Task Within Window",
            new DateTimeOffset(fourDaysAgo.Date.AddHours(9), localOffset),
            new DateTimeOffset(fourDaysAgo.Date.AddHours(10), localOffset));
        
        // 2. Overdue task outside 7-day window (ended 9 days ago) -> should NOT appear
        var nineDaysAgo = userTodayStart.AddDays(-9);
        await _seeder.CreateTaskAsync(userId, "Overdue Task Outside Window",
            new DateTimeOffset(nineDaysAgo.Date.AddHours(9), localOffset),
            new DateTimeOffset(nineDaysAgo.Date.AddHours(10), localOffset));
        
        // 3. Completed overdue task within window -> should NOT appear (IsDone = true)
        var completedTask = await _seeder.CreateTaskAsync(userId, "Completed Overdue Task",
            new DateTimeOffset(fourDaysAgo.Date.AddHours(11), localOffset),
            new DateTimeOffset(fourDaysAgo.Date.AddHours(12), localOffset));
        completedTask.IsDone = true;
        await _context.SaveChangesAsync();

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDate = userNow,
            IncludeFloatingForToday = false
        };

        var threeDaysAgoQuery = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDate = threeDaysAgo,
            IncludeFloatingForToday = false
        };

        // Act
        var result = await _handler.Handle(query);
        var threeDaysAgoResult = await _handler.Handle(threeDaysAgoQuery);

        // Assert
        result.Should().Contain(t => t.Title == "Overdue Task Within Window",
            because: "Overdue task within 7-day window should appear on today's date.");
        
        result.Should().NotContain(t => t.Title == "Overdue Task Outside Window",
            because: "Overdue task outside the 7-day window should NOT appear.");
        
        result.Should().NotContain(t => t.Title == "Completed Overdue Task",
            because: "Completed overdue tasks should NOT roll over.");

        threeDaysAgoResult.Should().Contain(t => t.Title == "Overdue Task Within Window",
            because: "Overdue task within 7-day window should appear on three days ago's date.");

        threeDaysAgoResult.Should().NotContain(t => t.Title == "Overdue Task Outside Window",
            because: "Overdue task outside the 7-day window should NOT appear.");

        threeDaysAgoResult.Should().NotContain(t => t.Title == "Completed Overdue Task",
            because: "Completed overdue tasks should NOT roll over three days ago.");
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
        var queryDate = new DateTimeOffset(2026, 3, 14, 0, 0, 0, TimeSpan.Zero);
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
            StartDate = queryDate,
            IncludeFloatingForToday = false
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert: "Go to Gym" appears but has no DB row yet (Id = null), only the template reference
        var virtualTask = result.Should().ContainSingle(t => t.Title == "Go to Gym").Subject;
        virtualTask.Id.Should().BeNull(because: "user has not interacted with today's occurrence yet — no DB row saved");
        virtualTask.RecurringTaskId.Should().NotBeNull(because: "virtual task must reference its recurring template so the frontend knows which template it belongs to");
    }

    [Fact]
    public async Task Handle_ShouldReturnStoredRow_NotVirtual_WhenOccurrenceAlreadySaved()
    {
        // Scenario: User has "Morning Run" as a daily recurring task.
        // They already marked today's run as done — a real DB row now exists for today.
        // Expected: only 1 "Morning Run" appears (the saved row), not 2 (saved + virtual duplicate).
        var userId = await _seeder.CreateUserAsync();
        var queryDate = new DateTimeOffset(2026, 3, 14, 0, 0, 0, TimeSpan.Zero);
        var templateTime = new DateTimeOffset(2026, 3, 14, 9, 0, 0, TimeSpan.Zero);

        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Morning Run",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 3, 14),
            templateStartTime: templateTime);

        // User tapped "done" on today's occurrence → a real TaskItem row was saved
        var savedOccurrence = await _seeder.CreateTaskAsync(
            userId,
            title: "Morning Run",
            start: templateTime,
            end: templateTime);
        savedOccurrence.RecurringTaskId = recurring.Id;
        savedOccurrence.IsDone = true;
        await _context.SaveChangesAsync();

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDate = queryDate,
            IncludeFloatingForToday = false
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert: exactly 1 "Morning Run", with a real Id and marked done — no virtual duplicate
        var taskResults = result.Where(t => t.Title == "Morning Run").ToList();
        taskResults.Should().HaveCount(1, because: "the saved DB row replaces the virtual occurrence — user should not see duplicates");
        taskResults[0].Id.Should().NotBeNull(because: "this is the real saved row, not a virtual one");
        taskResults[0].IsDone.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_WeeklyRecurring_ShouldAppearOnCorrectDay_AndNotOnWrongDay()
    {
        // Scenario: User sets up "Monday Yoga" every Monday at 7am starting Mar 16 2026.
        // Querying on Monday Mar 16 → should appear.
        // Querying on Tuesday Mar 17 → should NOT appear (yoga is Monday-only).
        var userId = await _seeder.CreateUserAsync();
        var monday = new DateTimeOffset(2026, 3, 16, 0, 0, 0, TimeSpan.Zero);
        var tuesday = new DateTimeOffset(2026, 3, 17, 0, 0, 0, TimeSpan.Zero);
        var templateTime = new DateTimeOffset(2026, 3, 16, 7, 0, 0, TimeSpan.Zero);

        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Monday Yoga",
            frequency: RecurrenceFrequency.Weekly,
            startDate: new DateOnly(2026, 3, 16),
            templateStartTime: templateTime,
            daysOfWeek: (int)WeeklyDayFlags.Monday);

        var mondayQuery = new GetTasksByDateQuery { UserId = userId, StartDate = monday, IncludeFloatingForToday = false };
        var tuesdayQuery = new GetTasksByDateQuery { UserId = userId, StartDate = tuesday, IncludeFloatingForToday = false };

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
        // Querying on Mar 1 2026 → should appear (3 months later, same day of month).
        // Querying on Mar 2 2026 → should NOT appear (rent is only on the 1st).
        var userId = await _seeder.CreateUserAsync();
        var march1 = new DateTimeOffset(2026, 3, 1, 0, 0, 0, TimeSpan.Zero);
        var march2 = new DateTimeOffset(2026, 3, 2, 0, 0, 0, TimeSpan.Zero);
        var templateTime = new DateTimeOffset(2026, 1, 1, 9, 0, 0, TimeSpan.Zero);

        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Pay Rent",
            frequency: RecurrenceFrequency.Monthly,
            startDate: new DateOnly(2026, 1, 1),
            templateStartTime: templateTime);

        var march1Query = new GetTasksByDateQuery { UserId = userId, StartDate = march1, IncludeFloatingForToday = false };
        var march2Query = new GetTasksByDateQuery { UserId = userId, StartDate = march2, IncludeFloatingForToday = false };

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
        // Querying on Mar 14 2026 → should appear (1 year later, same month and day).
        // Querying on Mar 15 2026 → should NOT appear (checkup is only on Mar 14).
        var userId = await _seeder.CreateUserAsync();
        var anniversary = new DateTimeOffset(2026, 3, 14, 0, 0, 0, TimeSpan.Zero);
        var dayAfter = new DateTimeOffset(2026, 3, 15, 0, 0, 0, TimeSpan.Zero);
        var templateTime = new DateTimeOffset(2025, 3, 14, 10, 0, 0, TimeSpan.Zero);

        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Annual Health Checkup",
            frequency: RecurrenceFrequency.Yearly,
            startDate: new DateOnly(2025, 3, 14),
            templateStartTime: templateTime);

        var anniversaryQuery = new GetTasksByDateQuery { UserId = userId, StartDate = anniversary, IncludeFloatingForToday = false };
        var dayAfterQuery = new GetTasksByDateQuery { UserId = userId, StartDate = dayAfter, IncludeFloatingForToday = false };

        var anniversaryResult = await _handler.Handle(anniversaryQuery);
        var dayAfterResult = await _handler.Handle(dayAfterQuery);

        anniversaryResult.Should().Contain(t => t.Title == "Annual Health Checkup",
            because: "Mar 14 2026 is exactly one year after Mar 14 2025 — yearly checkup should appear");
        dayAfterResult.Should().NotContain(t => t.Title == "Annual Health Checkup",
            because: "Mar 15 2026 is not the anniversary date — checkup should not appear");
    }
}

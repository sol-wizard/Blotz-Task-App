using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Queries.Tasks;
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
        _handler = new GetTasksByDateQueryHandler(_context, logger);
    }

    [Fact]
    public async Task Handle_ShouldReturnTasks_OnlyIfTheyFallWithinTheSelectedDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        
        // Simulate a user in UTC+8 selecting "2024-11-21"
        // Their "Start of Day" is 2024-11-21 00:00:00 +08:00 -> 2024-11-20 16:00:00 UTC
        var clientStartDateUtc = new DateTime(2024, 11, 20, 16, 0, 0, DateTimeKind.Utc);
        
        // The API calculates the window as: [clientStartDateUtc] to [clientStartDateUtc + 1 Day]
        // Window: Nov 20 16:00 UTC -> Nov 21 16:00 UTC

        // 1. Task Inside Window: Clearly inside
        await _seeder.CreateTaskAsync(userId, "Task Inside Window", clientStartDateUtc.AddHours(2), clientStartDateUtc.AddHours(3));
        
        // 2. Task Spanning Window: Starts before, ends inside
        await _seeder.CreateTaskAsync(userId, "Task Spanning Window", clientStartDateUtc.AddHours(-1), clientStartDateUtc.AddHours(1));
        
        // 3. Boundary Edge Case (START): Task ends EXACTLY when the window starts
        // Logic: t.EndTime >= query.StartDateUtc
        // This task belongs to the PREVIOUS day but touches the boundary. 
        // Currently INCLUDED due to >= logic.
        await _seeder.CreateTaskAsync(userId, "Task Ending At Start", clientStartDateUtc.AddHours(-1), clientStartDateUtc);

        // 4. Boundary Edge Case (END): Task starts EXACTLY when the window ends
        // Logic: t.StartTime < endDateUtc
        // This task belongs to the NEXT day.
        // Currently EXCLUDED due to < logic.
        await _seeder.CreateTaskAsync(userId, "Task Starting At End", clientStartDateUtc.AddDays(1), clientStartDateUtc.AddDays(1).AddHours(1));

        // 5. Task Outside (Before): Ends well before start
        await _seeder.CreateTaskAsync(userId, "Task Outside (Before)", clientStartDateUtc.AddHours(-5), clientStartDateUtc.AddHours(-4));
        
        // 6. Task Outside (After): Starts well after end
        await _seeder.CreateTaskAsync(userId, "Task Outside (After)", clientStartDateUtc.AddDays(1).AddHours(1), clientStartDateUtc.AddDays(1).AddHours(2));

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDateUtc = clientStartDateUtc,
            IncludeFloatingForToday = false
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
            StartDateUtc = londonRequestDateUtc,
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
            StartDateUtc = parisRequestDateUtc,
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
    public async Task Handle_ShouldReturnFloatingTasks_OnlyWhenCreatedOnTheSelectedDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        
        // The specific date the user is looking at on their calendar (e.g., "Today")
        var userSelectedDateUtc = new DateTime(2024, 11, 25, 0, 0, 0, DateTimeKind.Utc);

        // 1. Floating task created ON this selected date (e.g. user added a quick todo "today")
        // This represents a task the user just added to their list for the day.
        var todayNoon = userSelectedDateUtc.AddHours(12);
        await _seeder.CreateTaskAsync(userId, "Floating Task Created Today", null, null, createdAt: todayNoon);

        // 2. Floating task created YESTERDAY
        // This represents an old floating task from the past. It should NOT show up on today's view.
        var yesterdayNoon = userSelectedDateUtc.AddDays(-1).AddHours(12);
        await _seeder.CreateTaskAsync(userId, "Floating Task Created Yesterday", null, null, createdAt: yesterdayNoon);

        // 3. Regular scheduled task for TODAY
        // This is a standard calendar event/task with a start and end time.
        await _seeder.CreateTaskAsync(userId, "Scheduled Task For Today", userSelectedDateUtc.AddHours(10), userSelectedDateUtc.AddHours(11));

        // Scenario A: User views the calendar and wants to see floating tasks for that day
        var queryRequestingFloatingTasks = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDateUtc = userSelectedDateUtc,
            IncludeFloatingForToday = true
        };

        // Scenario B: User views the calendar but wants to hide floating tasks (focus only on scheduled work)
        var queryHidingFloatingTasks = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDateUtc = userSelectedDateUtc,
            IncludeFloatingForToday = false
        };

        // Act
        var resultWithFloatingTasks = await _handler.Handle(queryRequestingFloatingTasks);
        var resultWithoutFloatingTasks = await _handler.Handle(queryHidingFloatingTasks);

        // Assert
        
        // Validation for Scenario A (Include Floating)
        resultWithFloatingTasks.Should().Contain(t => t.Title == "Floating Task Created Today",
            because: "The user created this floating task on the selected date, so it should appear.");
            
        resultWithFloatingTasks.Should().Contain(t => t.Title == "Scheduled Task For Today",
            because: "Scheduled tasks for the day should always appear.");
        
        resultWithFloatingTasks.Should().NotContain(t => t.Title == "Floating Task Created Yesterday",
            because: "Floating tasks created in the past should not clutter today's view.");

        // Validation for Scenario B (Exclude Floating)
        resultWithoutFloatingTasks.Should().NotContain(t => t.Title == "Floating Task Created Today",
            because: "The user specifically requested to hide floating tasks for this view.");
            
        resultWithoutFloatingTasks.Should().Contain(t => t.Title == "Scheduled Task For Today",
            because: "Scheduled tasks should still appear even when floating tasks are hidden.");
    }
}

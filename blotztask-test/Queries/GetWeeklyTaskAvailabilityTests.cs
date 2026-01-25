using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetWeeklyTaskAvailabilityTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly GetWeeklyTaskAvailabilityQueryHandler _handler;
    private readonly DataSeeder _seeder;

    public GetWeeklyTaskAvailabilityTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        var logger = TestDbContextFactory.CreateLogger<GetWeeklyTaskAvailabilityQueryHandler>();
        _handler = new GetWeeklyTaskAvailabilityQueryHandler(_context, logger);
    }

    [Fact(Skip = "Expected failure until API excludes floating tasks from calendar green-dot logic; floating tasks belong in Reminder UI.")]
    public async Task Handle_ShouldReturnTrue_WhenUserHasTasksOnTheDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var monday = new DateTimeOffset(2024, 12, 9, 0, 0, 0, TimeSpan.Zero);

        // 1. Completed Task on Monday
        var completedTask = await _seeder.CreateTaskAsync(userId, "Completed Task", monday.AddHours(9), monday.AddHours(10));
        completedTask.IsDone = true;
        await _context.SaveChangesAsync(); // Update the IsDone status

        // 2. Incomplete Task on Tuesday
        await _seeder.CreateTaskAsync(userId, "Incomplete Task", monday.AddDays(1).AddHours(10), monday.AddDays(1).AddHours(11));

        // 3. Floating Task Created on Wednesday
        // This task has NO start/end time, but its CreatedAt matches Wednesday.
        // The green dot should NOT appear because floating tasks will be shown in a separate Reminder UI, not on the calendar page.
        await _seeder.CreateTaskAsync(userId, "Floating Task Wednesday", null, null, createdAt: monday.AddDays(2).AddHours(12));

        var query = new GetWeeklyTaskAvailabilityQuery
        {
            UserId = userId,
            Monday = monday
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        // Monday (Index 0) - Has a COMPLETED task -> Should show dot (True)
        result[0].HasTask.Should().BeTrue("A completed task exists on Monday, so the green dot should appear below the date.");

        // Tuesday (Index 1) - Has an INCOMPLETE task -> Should show dot (True)
        result[1].HasTask.Should().BeTrue("An incomplete task exists on Tuesday, so the green dot should appear below the date.");
        
        // Wednesday (Index 2) - Has a FLOATING task created that day -> Should NOT show dot (False)
        // Floating tasks will be shown in a separate Reminder UI, not on the calendar page
        result[2].HasTask.Should().BeFalse("Floating tasks will be shown in a separate Reminder UI, so no green dot should appear for them on the calendar.");
        
        // Thursday (Index 3) - No task -> No dot (False)
        result[3].HasTask.Should().BeFalse("No tasks exist for Thursday, so no green dot should appear.");
    }

    [Fact]
    public async Task Handle_ShouldShowOverdueTask_WithinSevenDayWindow()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        
        // Use current week's Monday to properly test overdue rollover
        var userNow = DateTimeOffset.Now;
        var localOffset = userNow.Offset; // Use local timezone consistently
        var daysSinceMonday = ((int)userNow.DayOfWeek + 6) % 7; // Monday = 0
        var monday = new DateTimeOffset(userNow.Date.AddDays(-daysSinceMonday), localOffset);
        var lastMonday = monday.AddDays(-7);
        
        // Create an overdue task (ended 2 days ago, within 7-day window, NOT done)
        var twoDaysAgo = userNow.AddDays(-2);
        await _seeder.CreateTaskAsync(userId, "Overdue Task", 
            new DateTimeOffset(twoDaysAgo.Date.AddHours(9), TimeSpan.Zero), 
            new DateTimeOffset(twoDaysAgo.Date.AddHours(10), TimeSpan.Zero));
        
        // Create another overdue task (out of the 7-day window)
        var nineDaysAgo = userNow.AddDays(-9);
        await _seeder.CreateTaskAsync(userId, "Overdue Task out of 7-day window", 
            new DateTimeOffset(nineDaysAgo.Date.AddHours(9), TimeSpan.Zero), 
            new DateTimeOffset(nineDaysAgo.Date.AddHours(10), TimeSpan.Zero));
        
        // Query both current week and last week (7-day window can span both)
        var query = new GetWeeklyTaskAvailabilityQuery
        {
            UserId = userId,
            Monday = monday
        };
        var lastWeekQuery = new GetWeeklyTaskAvailabilityQuery
        {
            UserId = userId,
            Monday = lastMonday
        };
        
        // Act - Combine last week + current week into a 14-day result (indices 0-6: last week, 7-13: this week)
        var lastWeekResult = await _handler.Handle(lastWeekQuery);
        var currentWeekResult = await _handler.Handle(query);
        var result = lastWeekResult.Concat(currentWeekResult).ToList();
        
        // Calculate indices relative to the combined 14-day list
        var todayIndex = 7 + daysSinceMonday;
        var yesterdayIndex = todayIndex - 1;
        var sevenDaysAgoIndex = todayIndex - 7; // First day of 7-day window
        
        // Assert 1: Today should show the overdue task
        result[todayIndex].HasTask.Should().BeTrue(
            "Overdue task within 7-day window should appear on today's date");
        
        // Assert 2: Yesterday should also show the overdue task (rolled over)
        result[yesterdayIndex].HasTask.Should().BeTrue(
            "Overdue task within 7-day window should appear on yesterday's date");
        
        // Assert 3: First day of 7-day window (7 days ago) should NOT have the task
        // The task ended only 2 days ago, so it shouldn't appear 7 days ago
        result[sevenDaysAgoIndex].HasTask.Should().BeFalse(
            "Overdue task (ended 2 days ago) should NOT appear at the start of 7-day window");
    }
}

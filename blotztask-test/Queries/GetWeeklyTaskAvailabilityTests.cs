using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Modules.Users.Domain;
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
        _handler = new GetWeeklyTaskAvailabilityQueryHandler(_context, new(), logger);
    }

    [Fact]
    public async Task Handle_ShouldReturnTrue_WhenUserHasTasksOnTheDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var userNow = DateTimeOffset.Now;
        var localOffset = userNow.Offset;
        var daysSinceMonday = ((int)userNow.DayOfWeek + 6) % 7;
        var monday = new DateTimeOffset(userNow.Date.AddDays(-daysSinceMonday), localOffset).AddDays(14);

        // 1. Completed Task on Monday
        var completedTask = await _seeder.CreateTaskAsync(userId, "Completed Task", monday.AddHours(9), monday.AddHours(10));
        completedTask.IsDone = true;
        await _context.SaveChangesAsync(); // Update the IsDone status

        // 2. Incomplete Task on Tuesday
        await _seeder.CreateTaskAsync(userId, "Incomplete Task", monday.AddDays(1).AddHours(10), monday.AddDays(1).AddHours(11));
        
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
    public async Task Handle_ShouldIncludeOverdueTasks_ForCurrentWeek_ButNotFutureOrTooEarlyHistoricalWeeks()
    {
        var userId = await _seeder.CreateUserAsync();
        var userNow = DateTimeOffset.Now;
        var localOffset = userNow.Offset;
        var daysSinceMonday = ((int)userNow.DayOfWeek + 6) % 7;
        var monday = new DateTimeOffset(userNow.Date.AddDays(-daysSinceMonday), localOffset);
        var historicalMonday = monday.AddDays(-14);
        var nextMonday = monday.AddDays(7);
        
        _context.UserPreferences.Add(new UserPreference { UserId = userId, AutoRollover = true });
        await _context.SaveChangesAsync();


        var sevenDaysAgo = new DateTimeOffset(userNow.Date, localOffset).AddDays(-7);
        await _seeder.CreateTaskAsync(
            userId,
            "Old Overdue Task",
            new DateTimeOffset(sevenDaysAgo.Date.AddHours(9), localOffset),
            new DateTimeOffset(sevenDaysAgo.Date.AddHours(10), localOffset));

        var scheduledFutureDay = nextMonday.AddDays(2);
        await _seeder.CreateTaskAsync(
            userId,
            "Future Scheduled Task",
            scheduledFutureDay.AddHours(9),
            scheduledFutureDay.AddHours(10));

        var currentWeekQuery = new GetWeeklyTaskAvailabilityQuery
        {
            UserId = userId,
            Monday = monday
        };
        var historicalWeekQuery = new GetWeeklyTaskAvailabilityQuery
        {
            UserId = userId,
            Monday = historicalMonday
        };
        var futureWeekQuery = new GetWeeklyTaskAvailabilityQuery
        {
            UserId = userId,
            Monday = nextMonday
        };

        var currentWeekResult = await _handler.Handle(currentWeekQuery);
        var historicalWeekResult = await _handler.Handle(historicalWeekQuery);
        var futureWeekResult = await _handler.Handle(futureWeekQuery);

        currentWeekResult[daysSinceMonday].HasTask.Should().BeTrue(
            "the current week should surface overdue tasks even when they became overdue more than seven days ago");

        historicalWeekResult.Should().OnlyContain(day => !day.HasTask,
            because: "a week from 14 days ago should not show a task that did not become overdue until 7 days ago");
        
        futureWeekResult[2].HasTask.Should().BeTrue(
            "future week views should still show tasks scheduled during that future week");
        futureWeekResult[0].HasTask.Should().BeFalse(
            "future week views must not be marked by unrelated overdue tasks from the past");
    }
}

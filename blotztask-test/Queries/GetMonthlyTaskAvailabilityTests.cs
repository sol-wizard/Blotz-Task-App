using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetMonthlyTaskAvailabilityTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly GetMonthlyTaskAvailabilityQueryHandler _handler;
    private readonly DataSeeder _seeder;

    public GetMonthlyTaskAvailabilityTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        var logger = TestDbContextFactory.CreateLogger<GetMonthlyTaskAvailabilityQueryHandler>();
        _handler = new GetMonthlyTaskAvailabilityQueryHandler(_context, new(), logger);
    }

    [Fact]
    public async Task Handle_ShouldIncludeOverdueTasks_ForCurrentMonth_ButNotFutureOrTooEarlyHistoricalMonths()
    {
        var userId = await _seeder.CreateUserAsync();
        var userNow = DateTimeOffset.Now;
        var localOffset = userNow.Offset;
        var currentMonthStart = new DateTimeOffset(userNow.Year, userNow.Month, 1, 0, 0, 0, localOffset);
        var historicalMonthStart = currentMonthStart.AddMonths(-1);
        var nextMonthStart = currentMonthStart.AddMonths(1);
        
        // Create UserPreferences with AutoRollover enabled (required for overdue task rollover)
        _context.UserPreferences.Add(new UserPreference { UserId = userId, AutoRollover = true });
        await _context.SaveChangesAsync();

        var nineDaysAgo = new DateTimeOffset(userNow.Date, localOffset).AddDays(-9);
        await _seeder.CreateTaskAsync(
            userId,
            "Two Days Ago Overdue Task",
            new DateTimeOffset(nineDaysAgo.Date.AddHours(9), localOffset),
            new DateTimeOffset(nineDaysAgo.Date.AddHours(10), localOffset));
        
        var twoMonthsAgo = new DateTimeOffset(userNow.Date, localOffset).AddMonths(-2);
        await _seeder.CreateTaskAsync(
            userId,
            "Two Months Ago Overdue Task",
            new DateTimeOffset(twoMonthsAgo.Date.AddHours(11), localOffset),
            new DateTimeOffset(twoMonthsAgo.Date.AddHours(12), localOffset));

        var scheduledFutureDay = nextMonthStart.AddDays(4);
        await _seeder.CreateTaskAsync(
            userId,
            "Future Scheduled Task",
            scheduledFutureDay.AddHours(10),
            scheduledFutureDay.AddHours(11));

        var currentMonthQuery = new GetMonthlyTaskAvailabilityQuery
        {
            UserId = userId,
            FirstDate = currentMonthStart
        };
        var historicalMonthQuery = new GetMonthlyTaskAvailabilityQuery
        {
            UserId = userId,
            FirstDate = historicalMonthStart
        };

        var nextMonthQuery = new GetMonthlyTaskAvailabilityQuery
        {
            UserId = userId,
            FirstDate = nextMonthStart
        };

        var currentMonthResult = await _handler.Handle(currentMonthQuery);
        var historicalMonthResult = await _handler.Handle(historicalMonthQuery);
        var nextMonthResult = await _handler.Handle(nextMonthQuery);

        var todayIndicator = currentMonthResult.Single(day => day.Date.Date == userNow.Date);
        var historicalIndicator = historicalMonthResult.Single(day => day.Date.Date == historicalMonthStart.Date);
        var futureTaskIndicator = nextMonthResult.Single(day => day.Date.Date == scheduledFutureDay.Date);

        todayIndicator.TaskThumbnails.Should().Contain(t => t.TaskTitle == "Two Days Ago Overdue Task",
            because: "current month views should surface overdue tasks on today or earlier dates");
        
        todayIndicator.TaskThumbnails.Should().Contain(t => t.TaskTitle == "Two Months Ago Overdue Task",
            because: "current month views should surface overdue tasks on today or earlier dates");

        historicalIndicator.TaskThumbnails.Should().Contain(t => t.TaskTitle == "Two Months Ago Overdue Task",
            because: "a historical month should show a task that had ended on today or earlier dates");
        historicalMonthResult.Should().Contain(days => days.TaskThumbnails.Count == 1,
            because: "a historical month should not show a task that haven't ended on the selected month");

        futureTaskIndicator.TaskThumbnails.Should().Contain(t => t.TaskTitle == "Future Scheduled Task",
            because: "future month views should still include tasks scheduled in that month");
        futureTaskIndicator.TaskThumbnails.Should().NotContain(t => t.TaskTitle == "Old Overdue Task",
            because: "future month views must not include overdue tasks from the past");
    }
}

using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Queries.Tasks;
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
    public async Task Handle_ShouldShowTasksScheduledInFutureMonth()
    {
        var userId = await _seeder.CreateUserAsync();
        var userNow = DateTimeOffset.Now;
        var localOffset = userNow.Offset;
        var nextMonthStart = new DateTimeOffset(userNow.Year, userNow.Month, 1, 0, 0, 0, localOffset).AddMonths(1);

        var scheduledDay = nextMonthStart.AddDays(4);
        await _seeder.CreateTaskAsync(
            userId,
            "Future Scheduled Task",
            scheduledDay.AddHours(10),
            scheduledDay.AddHours(11));

        var query = new GetMonthlyTaskAvailabilityQuery
        {
            UserId = userId,
            FirstDate = nextMonthStart
        };

        var result = await _handler.Handle(query);

        var indicator = result.Single(day => day.Date.Date == scheduledDay.Date);
        indicator.TaskThumbnails.Should().Contain(t => t.TaskTitle == "Future Scheduled Task",
            because: "future month views should still include tasks scheduled in that month");
    }
}

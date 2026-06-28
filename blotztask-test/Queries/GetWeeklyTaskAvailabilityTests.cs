using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Enums;
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
        _handler = new GetWeeklyTaskAvailabilityQueryHandler(_context, new(), logger);
    }

    [Fact]
    public async Task Handle_ShouldReturnTrue_WhenUserHasTasksOnTheDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();

        // Pick a Monday 2 weeks from now so the window is safely in the future and won't collide with other tests.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysSinceMonday = ((int)today.DayOfWeek + 6) % 7;
        var monday = today.AddDays(-daysSinceMonday + 14);

        var mondayUtc = monday.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        // 1. Completed Task on Monday
        var completedTask = await _seeder.CreateTaskAsync(
            userId, "Completed Task",
            new DateTimeOffset(mondayUtc.AddHours(9), TimeSpan.Zero),
            new DateTimeOffset(mondayUtc.AddHours(10), TimeSpan.Zero));
        completedTask.IsDone = true;
        await _context.SaveChangesAsync();

        // 2. Incomplete Task on Tuesday
        var tuesdayUtc = mondayUtc.AddDays(1);
        await _seeder.CreateTaskAsync(
            userId, "Incomplete Task",
            new DateTimeOffset(tuesdayUtc.AddHours(10), TimeSpan.Zero),
            new DateTimeOffset(tuesdayUtc.AddHours(11), TimeSpan.Zero));

        var query = new GetWeeklyTaskAvailabilityQuery
        {
            UserId = userId,
            WeekStart = monday,
            TimeZoneId = "UTC"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        // Monday (Index 0) - Has a COMPLETED task -> should NOT show dot
        result[0].HasTask.Should().BeFalse(
            because: "a completed task is not counted for the weekly dot indicator — only incomplete tasks trigger the dot");

        // Tuesday (Index 1) - Has an INCOMPLETE task -> should show dot
        result[1].HasTask.Should().BeTrue(
            because: "an incomplete task exists on Tuesday, so the green dot should appear");

        // Wednesday (Index 2) - No task
        result[2].HasTask.Should().BeFalse(
            because: "no tasks exist for Wednesday, so no green dot should appear");

        // Thursday (Index 3) - No task
        result[3].HasTask.Should().BeFalse(
            because: "no tasks exist for Thursday, so no green dot should appear");
    }

    [Fact]
    public async Task Handle_ShouldShowDot_ForFutureScheduledTasks_AndNotForUnrelatedPastTasks()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysSinceMonday = ((int)today.DayOfWeek + 6) % 7;
        var thisMonday = today.AddDays(-daysSinceMonday);
        var nextMonday = thisMonday.AddDays(7);

        var sevenDaysAgo = today.AddDays(-7).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        await _seeder.CreateTaskAsync(
            userId, "Old Past Task",
            new DateTimeOffset(sevenDaysAgo.AddHours(9), TimeSpan.Zero),
            new DateTimeOffset(sevenDaysAgo.AddHours(10), TimeSpan.Zero));

        var wednesday = nextMonday.AddDays(2).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        await _seeder.CreateTaskAsync(
            userId, "Future Scheduled Task",
            new DateTimeOffset(wednesday.AddHours(9), TimeSpan.Zero),
            new DateTimeOffset(wednesday.AddHours(10), TimeSpan.Zero));

        var query = new GetWeeklyTaskAvailabilityQuery
        {
            UserId = userId,
            WeekStart = nextMonday,
            TimeZoneId = "UTC"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result[2].HasTask.Should().BeTrue(
            because: "future week views should show a dot for tasks scheduled during that week");
        result[0].HasTask.Should().BeFalse(
            because: "future week views must not show a dot for tasks not scheduled in that week");
    }

    [Fact]
    public async Task Handle_OvernightRecurringOccurrence_ShouldShowDotOnFollowingDay()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var monday = new DateOnly(2026, 6, 1);

        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Night Shift",
            frequency: RecurrenceFrequency.Weekly,
            startDate: monday,
            templateStartTime: new DateTimeOffset(2026, 6, 1, 22, 0, 0, TimeSpan.Zero),
            templateEndTime: new DateTimeOffset(2026, 6, 2, 1, 0, 0, TimeSpan.Zero),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            scheduleTimeZoneId: "UTC");

        var query = new GetWeeklyTaskAvailabilityQuery
        {
            UserId = userId,
            WeekStart = monday,
            TimeZoneId = "UTC"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result[0].HasTask.Should().BeTrue(
            because: "the weekly indicator should show the recurring event on its start day (Monday)");
        result[1].HasTask.Should().BeTrue(
            because: "the weekly indicator should also show the overnight continuation on the following day (Tuesday)");
    }
}

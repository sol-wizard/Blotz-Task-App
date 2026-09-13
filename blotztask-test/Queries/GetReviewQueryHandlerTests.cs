using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Reviews.Domain;
using BlotzTask.Modules.Reviews.Dtos;
using BlotzTask.Modules.Reviews.Enums;
using BlotzTask.Modules.Reviews.Queries;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetReviewQueryHandlerTests : IClassFixture<DatabaseFixture>
{
    private const string SydneyId = "Australia/Sydney";
    private static readonly TimeZoneInfo Sydney = TimeZoneInfo.FindSystemTimeZoneById(SydneyId);

    private readonly BlotzTaskDbContext _context;
    private readonly GetReviewQueryHandler _handler;
    private readonly DataSeeder _seeder;

    public GetReviewQueryHandlerTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new GetReviewQueryHandler(_context, TestDbContextFactory.CreateLogger<GetReviewQueryHandler>());
    }

    // The window the handler will resolve internally, so boundary samples can be seeded against it.
    private static ReviewPeriod Period(ReviewPeriodType periodType, DateOnly anchor) =>
        ReviewPeriod.CreateFromAnchor(periodType, anchor, Sydney);

    private Task<ReviewReportDto> HandleAsync(Guid userId, ReviewPeriodType periodType, DateOnly anchor) =>
        _handler.Handle(new GetReviewQuery
        {
            UserId = userId,
            PeriodType = periodType,
            AnchorDate = anchor,
            TimeZoneId = SydneyId,
        });

    [Fact]
    public async Task Handle_TasksInsideAndOutsideThePeriod_CountsOnlyThoseCompletedInside()
    {
        // Arrange — July 2026 for a Sydney user (AEST, UTC+10):
        // window is 2026-06-30 14:00 UTC (inclusive) -> 2026-07-31 14:00 UTC (exclusive).
        var userId = await _seeder.CreateUserAsync();
        var otherUserId = await _seeder.CreateUserAsync();
        var anchor = new DateOnly(2026, 7, 1);
        var insideJuly = new DateTimeOffset(2026, 7, 15, 3, 0, 0, TimeSpan.Zero);

        await _seeder.CreateTaskAsync(userId, "Completed mid-July", insideJuly, insideJuly.AddHours(1),
            completedAt: insideJuly);
        await _seeder.CreateTaskAsync(userId, "Completed mid-July again", insideJuly, insideJuly.AddHours(1),
            completedAt: insideJuly.AddDays(2));

        await _seeder.CreateTaskAsync(userId, "Still open", insideJuly, insideJuly.AddHours(1));

        await _seeder.CreateTaskAsync(userId, "Completed in August", insideJuly, insideJuly.AddHours(1),
            completedAt: new DateTimeOffset(2026, 8, 3, 3, 0, 0, TimeSpan.Zero));

        await _seeder.CreateTaskAsync(otherUserId, "Other user's task", insideJuly, insideJuly.AddHours(1),
            completedAt: insideJuly);

        // Act
        var result = await HandleAsync(userId, ReviewPeriodType.Monthly, anchor);

        // Assert
        result.TasksCompleted.Should().Be(2, because: "only the caller's own tasks with CompletedAt inside the period count");
    }

    [Fact]
    public async Task Handle_TaskPlannedBeforeThePeriodButCompletedInside_IsCounted()
    {
        // Arrange — the metric answers "what did I finish in July", so the planned date is irrelevant.
        var userId = await _seeder.CreateUserAsync();
        var anchor = new DateOnly(2026, 7, 1);
        var plannedInJune = new DateTimeOffset(2026, 6, 20, 3, 0, 0, TimeSpan.Zero);

        await _seeder.CreateTaskAsync(userId, "Planned June, finished July", plannedInJune, plannedInJune.AddHours(1),
            completedAt: new DateTimeOffset(2026, 7, 2, 3, 0, 0, TimeSpan.Zero));

        // Act
        var result = await HandleAsync(userId, ReviewPeriodType.Monthly, anchor);

        // Assert
        result.TasksCompleted.Should().Be(1, because: "the count keys on CompletedAt, not the planned StartTime");
    }

    [Fact]
    public async Task Handle_TasksOnTheMonthBoundaries_IncludesTheStartAndExcludesTheEnd()
    {
        // Arrange — the period is half-open [StartUtc, EndUtc), so the first instant belongs to
        // this month and the first instant of the next month belongs to the next review.
        var userId = await _seeder.CreateUserAsync();
        var anchor = new DateOnly(2026, 7, 1);
        var period = Period(ReviewPeriodType.Monthly, anchor);
        var anyTime = new DateTimeOffset(2026, 7, 15, 3, 0, 0, TimeSpan.Zero);

        await _seeder.CreateTaskAsync(userId, "Completed at first instant of July", anyTime, anyTime,
            completedAt: period.StartUtc);
        await _seeder.CreateTaskAsync(userId, "Completed one tick before July", anyTime, anyTime,
            completedAt: period.StartUtc.AddTicks(-1));
        await _seeder.CreateTaskAsync(userId, "Completed at first instant of August", anyTime, anyTime,
            completedAt: period.EndUtc);
        await _seeder.CreateTaskAsync(userId, "Completed one tick before August", anyTime, anyTime,
            completedAt: period.EndUtc.AddTicks(-1));

        // Act
        var result = await HandleAsync(userId, ReviewPeriodType.Monthly, anchor);

        // Assert
        result.TasksCompleted.Should().Be(2, because: "[StartUtc, EndUtc) includes the period's first instant and excludes the next period's");
    }

    [Fact]
    public async Task Handle_MonthSpanningADstTransition_UsesTheLocalMidnightBoundaries()
    {
        // Arrange — Sydney leaves DST on 2026-04-05, so April 2026 starts at UTC+11 and ends at
        // UTC+10. A fixed-offset window would be an hour wrong at one end; ReviewPeriod resolves
        // local midnight first, giving 2026-03-31 13:00 UTC -> 2026-04-30 14:00 UTC.
        var userId = await _seeder.CreateUserAsync();
        var anchor = new DateOnly(2026, 4, 1);
        var period = Period(ReviewPeriodType.Monthly, anchor);
        var anyTime = new DateTimeOffset(2026, 4, 15, 3, 0, 0, TimeSpan.Zero);

        period.StartUtc.Should().Be(new DateTimeOffset(2026, 3, 31, 13, 0, 0, TimeSpan.Zero),
            because: "1 April 2026 00:00 in Sydney is still AEDT (UTC+11)");
        period.EndUtc.Should().Be(new DateTimeOffset(2026, 4, 30, 14, 0, 0, TimeSpan.Zero),
            because: "1 May 2026 00:00 in Sydney is AEST (UTC+10) after DST ends");

        // 00:30 local on 1 April (AEDT) — inside April only if the +11 start offset is honoured;
        // a naive +10 window would start an hour later and drop it.
        await _seeder.CreateTaskAsync(userId, "Early on 1 April", anyTime, anyTime,
            completedAt: new DateTimeOffset(2026, 3, 31, 13, 30, 0, TimeSpan.Zero));
        // 23:30 local on 30 April (AEST) — inside April only if the +10 end offset is honoured;
        // a naive +11 window would end an hour earlier and drop it.
        await _seeder.CreateTaskAsync(userId, "Late on 30 April", anyTime, anyTime,
            completedAt: new DateTimeOffset(2026, 4, 30, 13, 30, 0, TimeSpan.Zero));
        // 23:30 local on 31 March (AEDT) — the previous month.
        await _seeder.CreateTaskAsync(userId, "Late on 31 March", anyTime, anyTime,
            completedAt: new DateTimeOffset(2026, 3, 31, 12, 30, 0, TimeSpan.Zero));
        // 00:30 local on 1 May (AEST) — the next month.
        await _seeder.CreateTaskAsync(userId, "Early on 1 May", anyTime, anyTime,
            completedAt: new DateTimeOffset(2026, 4, 30, 14, 30, 0, TimeSpan.Zero));

        // Act
        var result = await HandleAsync(userId, ReviewPeriodType.Monthly, anchor);

        // Assert
        result.TasksCompleted.Should().Be(2, because: "the window follows local midnight across the DST change, not a fixed offset");
    }

    [Fact]
    public async Task Handle_WeeklyPeriod_CountsTheTasksCompletedInThatWeek()
    {
        // Arrange — the week of Mon 13 July 2026 in Sydney (AEST, UTC+10):
        // window is 2026-07-12 14:00 UTC (inclusive) -> 2026-07-19 14:00 UTC (exclusive).
        var userId = await _seeder.CreateUserAsync();
        var anchor = new DateOnly(2026, 7, 13);
        var insideWeek = new DateTimeOffset(2026, 7, 15, 3, 0, 0, TimeSpan.Zero);

        await _seeder.CreateTaskAsync(userId, "Completed this week", insideWeek, insideWeek.AddHours(1),
            completedAt: insideWeek);
        await _seeder.CreateTaskAsync(userId, "Completed later the same week", insideWeek, insideWeek.AddHours(1),
            completedAt: insideWeek.AddDays(2));

        // Same month, but the following week — inside a monthly window, outside this weekly one.
        await _seeder.CreateTaskAsync(userId, "Completed next week", insideWeek, insideWeek.AddHours(1),
            completedAt: new DateTimeOffset(2026, 7, 22, 3, 0, 0, TimeSpan.Zero));

        // Act
        var result = await HandleAsync(userId, ReviewPeriodType.Weekly, anchor);

        // Assert
        result.TasksCompleted.Should().Be(2, because: "weekly resolves its own [StartUtc, EndUtc) and runs the same count");
    }
}

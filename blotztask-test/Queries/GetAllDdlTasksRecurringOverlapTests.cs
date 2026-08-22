using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Deadlines;
using BlotzTask.Shared.Time;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetAllDdlTasksRecurringOverlapTests : IClassFixture<DatabaseFixture>
{
    private const string TimeZoneId = "Australia/Perth";
    private static readonly TimeZoneInfo PerthTimeZone = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly GetAllDdlTasksQueryHandler _handler;

    public GetAllDdlTasksRecurringOverlapTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new GetAllDdlTasksQueryHandler(
            _context,
            new RecurringTaskGeneratorService(),
            TestDbContextFactory.CreateLogger<GetAllDdlTasksQueryHandler>());
    }

    private static DateOnly Today() => TimeZoneClock.Today(PerthTimeZone);

    private static DateTimeOffset PerthTime(DateOnly date, TimeOnly time) =>
        new(date.ToDateTime(time), TimeSpan.FromHours(8));

    [Fact]
    public async Task Handle_SameSeriesOverlappingDeadlineTemplates_ReturnsCurrentOccurrenceForEachTemplate()
    {
        // Arrange
        var today = Today();

        var userId = await _seeder.CreateUserAsync();
        var oldTemplate = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Pay bill",
            frequency: RecurrenceFrequency.Daily,
            startDate: today,
            templateStartTime: PerthTime(today, new TimeOnly(9, 0)),
            endDate: today.AddDays(1),
            isDeadline: true,
            deadlineOffsetDays: 0,
            deadlineTimeOfDay: new TimeOnly(18, 0),
            deadlineTimeZoneId: TimeZoneId);
        var newTemplate = await _seeder.CreateRecurringTaskVersionAsync(
            oldTemplate,
            title: "Pay bill shifted",
            startDate: today,
            templateStartTime: PerthTime(today, new TimeOnly(10, 0)));

        // Act
        var result = await _handler.Handle(new GetAllDdlTasksQuery
        {
            UserId = userId,
            TimeZoneId = TimeZoneId
        });

        // Assert
        var sameDateRows = result
            .Where(t => t.RecurringOccurrence?.OccurrenceDate == today)
            .ToList();

        sameDateRows.Should().HaveCount(2,
                because: "same-series overlapping deadline templates each expose their current occurrence");
        sameDateRows.Select(t => t.RecurringOccurrence?.RecurringTaskId)
            .Should()
            .BeEquivalentTo([oldTemplate.Id, newTemplate.Id],
                because: "same-date virtual deadline rows should be identified by their concrete recurring template");
    }
}

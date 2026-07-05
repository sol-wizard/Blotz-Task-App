using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Deadlines;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetAllDdlTasksRecurringOverlapTests : IClassFixture<DatabaseFixture>
{
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

    [Fact]
    public async Task Handle_SameSeriesOverlappingDeadlineTemplates_ReturnsCurrentOccurrenceForEachTemplate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var oldTemplate = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Pay bill",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.FromHours(8)),
            endDate: new DateOnly(2026, 7, 3),
            isDeadline: true,
            deadlineOffsetDays: 0,
            deadlineTimeOfDay: new TimeOnly(18, 0),
            deadlineTimeZoneId: "Australia/Perth");
        var newTemplate = await _seeder.CreateRecurringTaskVersionAsync(
            oldTemplate,
            title: "Pay bill shifted",
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 10, 0, 0, TimeSpan.FromHours(8)));

        // Act
        var result = await _handler.Handle(new GetAllDdlTasksQuery
        {
            UserId = userId,
            Now = new DateTimeOffset(2026, 7, 2, 12, 0, 0, TimeSpan.FromHours(8))
        });

        // Assert
        var sameDateRows = result
            .Where(t => t.RecurringOccurrence?.OccurrenceDate == new DateOnly(2026, 7, 2))
            .ToList();

        sameDateRows.Should().HaveCount(2,
                because: "same-series overlapping deadline templates each expose their current occurrence");
        sameDateRows.Select(t => t.RecurringOccurrence?.RecurringTaskId)
            .Should()
            .BeEquivalentTo([oldTemplate.Id, newTemplate.Id],
                because: "same-date virtual deadline rows should be identified by their concrete recurring template");
    }
}

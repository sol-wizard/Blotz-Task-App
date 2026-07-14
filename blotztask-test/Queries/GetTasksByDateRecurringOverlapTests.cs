using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetTasksByDateRecurringOverlapTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly GetTasksByDateQueryHandler _handler;

    public GetTasksByDateRecurringOverlapTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new GetTasksByDateQueryHandler(
            _context,
            new RecurringTaskGeneratorService(),
            TestDbContextFactory.CreateLogger<GetTasksByDateQueryHandler>());
    }

    [Fact]
    public async Task Handle_SameSeriesSameDateOldTemplateSkipped_ReturnsFutureTemplateOccurrence()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var oldTemplate = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily review",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.FromHours(8)),
            endDate: new DateOnly(2026, 7, 3));
        var futureTemplate = await _seeder.CreateRecurringTaskVersionAsync(
            oldTemplate,
            title: "Daily review shifted",
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 10, 0, 0, TimeSpan.FromHours(8)));
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            oldTemplate,
            new DateOnly(2026, 7, 2),
            RecurringOccurrenceOverrideType.Skipped);

        // Act
        var result = await _handler.Handle(new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2026, 7, 2),
            TimeZoneId = "Australia/Perth"
        });

        // Assert
        result
            .Where(t => t.RecurringOccurrence?.OccurrenceDate == new DateOnly(2026, 7, 2))
            .Select(t => t.RecurringOccurrence!.RecurringTaskId)
            .Should().BeEquivalentTo(new[] { futureTemplate.Id },
                because: "a skipped override for the old template must not suppress the overlapping future template");
    }
}

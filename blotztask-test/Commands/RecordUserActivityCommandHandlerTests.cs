using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Commands;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class RecordUserActivityCommandHandlerTests : IClassFixture<DatabaseFixture>
{
    private const string SydneyId = "Australia/Sydney";
    private const string NewYorkId = "America/New_York";

    // 21:30 UTC on the 26th is 07:30 on the 27th in Sydney (AEST, UTC+10) but still the 26th in
    // New York and in UTC — so which date lands in the table shows which timezone was used.
    private static readonly DateTime MorningInSydneyUtc = new(2026, 9, 26, 21, 30, 0, DateTimeKind.Utc);
    private static readonly DateOnly SydneyDate = new(2026, 9, 27);
    private static readonly DateOnly UtcDate = new(2026, 9, 26);

    private readonly BlotzTaskDbContext _context;
    private readonly RecordUserActivityCommandHandler _handler;
    private readonly DataSeeder _seeder;

    public RecordUserActivityCommandHandlerTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new RecordUserActivityCommandHandler(
            _context, TestDbContextFactory.CreateLogger<RecordUserActivityCommandHandler>());
    }

    private static RecordUserActivityCommand Command(Guid userId, string? timeZoneId, DateTime nowUtc) =>
        new() { UserId = userId, TimeZoneId = timeZoneId, NowUtc = nowUtc };

    private Task<List<DateOnly>> RecordedDatesAsync(Guid userId) =>
        _context.UserActivityDays
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => a.LocalDate)
            .ToListAsync();

    [Fact]
    public async Task Handle_RequestTimeZoneAheadOfUtc_RecordsTheLocalDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();

        // Act
        await _handler.Handle(Command(userId, SydneyId, MorningInSydneyUtc));

        // Assert
        (await RecordedDatesAsync(userId)).Should().BeEquivalentTo(new[] { SydneyDate },
            because: "a Sydney morning is already the next day locally even though UTC has not rolled over");
    }

    [Fact]
    public async Task Handle_RequestAndStoredTimezonesDisagree_PrefersTheRequest()
    {
        // Arrange — the stored timezone is stale (e.g. the user has since travelled).
        var userId = await _seeder.CreateUserAsync(timezone: NewYorkId);

        // Act
        await _handler.Handle(Command(userId, SydneyId, MorningInSydneyUtc));

        // Assert
        (await RecordedDatesAsync(userId)).Should().BeEquivalentTo(new[] { SydneyDate },
            because: "the device timezone is where the user is now; the stored one is only written at login");
    }

    [Fact]
    public async Task Handle_NoRequestTimeZone_UsesTheStoredTimezone()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync(timezone: SydneyId);

        // Act
        await _handler.Handle(Command(userId, null, MorningInSydneyUtc));

        // Assert
        (await RecordedDatesAsync(userId)).Should().BeEquivalentTo(new[] { SydneyDate },
            because: "the stored timezone is the fallback when the request carries none");
    }

    [Fact]
    public async Task Handle_UnknownRequestTimeZone_FallsBackToTheStoredTimezone()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync(timezone: SydneyId);

        // Act
        var act = () => _handler.Handle(Command(userId, "Not/AZone", MorningInSydneyUtc));

        // Assert
        await act.Should().NotThrowAsync(because: "an activity call must never surface an error to the app");
        (await RecordedDatesAsync(userId)).Should().BeEquivalentTo(new[] { SydneyDate },
            because: "an unknown request timezone is skipped rather than rejected");
    }

    [Fact]
    public async Task Handle_NoTimezoneAnywhere_RecordsTheUtcDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();

        // Act
        await _handler.Handle(Command(userId, null, MorningInSydneyUtc));

        // Assert
        (await RecordedDatesAsync(userId)).Should().BeEquivalentTo(new[] { UtcDate },
            because: "UTC is the last resort when neither the request nor the user has a timezone");
    }

    [Fact]
    public async Task Handle_ReopenedOnTheSameLocalDay_KeepsOneRow()
    {
        // Arrange — 07:30 and 09:30 on the same Sydney day.
        var userId = await _seeder.CreateUserAsync();
        await _handler.Handle(Command(userId, SydneyId, MorningInSydneyUtc));

        // Act
        var act = () => _handler.Handle(Command(userId, SydneyId, MorningInSydneyUtc.AddHours(2)));

        // Assert
        await act.Should().NotThrowAsync(because: "a repeat open on the same day is the common case, not an error");
        (await RecordedDatesAsync(userId)).Should().BeEquivalentTo(new[] { SydneyDate },
            because: "the table holds one row per user per local day");
    }

    [Fact]
    public async Task Handle_OpenedOnTwoLocalDays_RecordsEachDay()
    {
        // Arrange — 07:30 on the 27th, then 00:30 on the 28th in Sydney (an app left open past midnight).
        var userId = await _seeder.CreateUserAsync();
        await _handler.Handle(Command(userId, SydneyId, MorningInSydneyUtc));

        // Act
        await _handler.Handle(Command(userId, SydneyId, MorningInSydneyUtc.AddHours(17)));

        // Assert
        (await RecordedDatesAsync(userId)).Should().BeEquivalentTo(new[] { SydneyDate, SydneyDate.AddDays(1) },
            because: "crossing local midnight starts a new day that must get its own row");
    }
}

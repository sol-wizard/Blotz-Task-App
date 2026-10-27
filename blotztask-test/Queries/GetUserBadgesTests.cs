using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Queries;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetUserBadgesTests : IClassFixture<DatabaseFixture>
{
    private readonly DataSeeder _seeder;
    private readonly GetUserBadgesQueryHandler _handler;

    public GetUserBadgesTests(DatabaseFixture fixture)
    {
        var context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(context);
        _handler = new GetUserBadgesQueryHandler(
            context,
            TestDbContextFactory.CreateLogger<GetUserBadgesQueryHandler>());
    }

    [Fact]
    public async Task Handle_RepeatableBadgeEarnedThreeTimes_ReturnsItOnceAtFirstAward()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var repeatable = await _seeder.CreateBadgeAsync("Early bird", isRepeatable: true);
        var other = await _seeder.CreateBadgeAsync("Hard worker");
        var start = new DateTimeOffset(2026, 10, 1, 9, 0, 0, TimeSpan.Zero);
        await _seeder.CreateUserBadgeAsync(userId, repeatable.Id, start, displayOrder: 0);
        await _seeder.CreateUserBadgeAsync(userId, other.Id, start.AddDays(1), displayOrder: 1);
        await _seeder.CreateUserBadgeAsync(userId, repeatable.Id, start.AddDays(2));
        await _seeder.CreateUserBadgeAsync(userId, repeatable.Id, start.AddDays(3));

        // Act
        var badges = await _handler.Handle(new GetUserBadgesQuery { UserId = userId }, CancellationToken.None);

        // Assert
        badges.Select(b => b.Id).Should().Equal([repeatable.Id, other.Id],
            because: "the wall shows each badge once, ordered by when it was first earned");
        badges[0].EquippedSlot.Should().Be(0,
            because: "the badge keeps the slot held by its first copy");
    }
}

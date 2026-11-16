using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Queries;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetBadgeByIdTests : IClassFixture<DatabaseFixture>
{
    private readonly DataSeeder _seeder;
    private readonly GetBadgeByIdQueryHandler _handler;

    public GetBadgeByIdTests(DatabaseFixture fixture)
    {
        var context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(context);
        _handler = new GetBadgeByIdQueryHandler(
            context,
            TestDbContextFactory.CreateLogger<GetBadgeByIdQueryHandler>());
    }

    [Fact]
    public async Task Handle_RepeatableBadgeEarnedTwice_ReturnsFirstAward()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var badge = await _seeder.CreateBadgeAsync("Early bird", isRepeatable: true);
        var firstEarned = new DateTimeOffset(2026, 10, 1, 9, 0, 0, TimeSpan.Zero);
        // Seed the later copy first, so insertion order can't hide a missing sort.
        await _seeder.CreateUserBadgeAsync(userId, badge.Id, firstEarned.AddDays(5));
        await _seeder.CreateUserBadgeAsync(userId, badge.Id, firstEarned, displayOrder: 0);

        // Act
        var detail = await _handler.Handle(
            new GetBadgeByIdQuery { UserId = userId, BadgeId = badge.Id }, CancellationToken.None);

        // Assert
        detail.ObtainedAt.Should().Be(firstEarned,
            because: "the detail page always shows when the badge was first earned");
        detail.EquippedSlot.Should().Be(0,
            because: "the first copy is the one that holds the badge's display slot");
    }
}

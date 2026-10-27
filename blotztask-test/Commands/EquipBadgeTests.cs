using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class EquipBadgeTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly EquipBadgeCommandHandler _handler;

    public EquipBadgeTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new EquipBadgeCommandHandler(
            _context,
            TestDbContextFactory.CreateLogger<EquipBadgeCommandHandler>());
    }

    [Fact]
    public async Task Handle_RepeatableBadgeAlreadyOnDisplay_DoesNotTakeSecondSlot()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var badge = await _seeder.CreateBadgeAsync("Early bird", isRepeatable: true);
        var firstEarned = new DateTimeOffset(2026, 10, 1, 9, 0, 0, TimeSpan.Zero);
        await _seeder.CreateUserBadgeAsync(userId, badge.Id, firstEarned, displayOrder: 0);
        await _seeder.CreateUserBadgeAsync(userId, badge.Id, firstEarned.AddDays(1));

        // Act
        await _handler.Handle(new EquipBadgeCommand { UserId = userId, BadgeId = badge.Id }, CancellationToken.None);

        var slots = await _context.UserBadges
            .Where(ub => ub.UserId == userId && ub.DisplayOrder != null)
            .Select(ub => ub.DisplayOrder)
            .ToListAsync();

        // Assert
        slots.Should().Equal([0], because: "a badge on display holds one slot, however many copies the user has");
    }

    [Fact]
    public async Task Handle_RepeatableBadgeNotOnDisplay_EquipsFirstCopy()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var badge = await _seeder.CreateBadgeAsync("Early bird", isRepeatable: true);
        var firstEarned = new DateTimeOffset(2026, 10, 1, 9, 0, 0, TimeSpan.Zero);
        var later = await _seeder.CreateUserBadgeAsync(userId, badge.Id, firstEarned.AddDays(1));
        var first = await _seeder.CreateUserBadgeAsync(userId, badge.Id, firstEarned);

        // Act
        await _handler.Handle(new EquipBadgeCommand { UserId = userId, BadgeId = badge.Id }, CancellationToken.None);

        await _context.Entry(first).ReloadAsync();
        await _context.Entry(later).ReloadAsync();

        // Assert
        first.DisplayOrder.Should().Be(0, because: "the first award stands for the badge on the wall");
        later.DisplayOrder.Should().BeNull(because: "only one copy of a badge is ever on display");
    }
}

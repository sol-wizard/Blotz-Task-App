using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class AwardNewBadgesToUserTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly AwardNewBadgesToUserHandler _handler;

    public AwardNewBadgesToUserTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new AwardNewBadgesToUserHandler(
            _context,
            TestDbContextFactory.CreateLogger<AwardNewBadgesToUserHandler>());
    }

    [Fact]
    public async Task Handle_NonRepeatableBadgeAlreadyEarned_DoesNotAwardAgain()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var badge = await _seeder.CreateBadgeAsync("Early bird");
        await _seeder.CreateUserBadgeAsync(userId, badge.Id, DateTimeOffset.UtcNow.AddDays(-1), displayOrder: 0);

        // Act
        var awarded = await _handler.Handle(new AwardNewBadgesToUserCommand
        {
            UserId = userId,
            BadgeIds = [badge.Id]
        }, CancellationToken.None);

        var rows = await _context.UserBadges.CountAsync(ub => ub.UserId == userId && ub.BadgeId == badge.Id);

        // Assert
        awarded.Should().BeEmpty(because: "a non-repeatable badge can only be earned once");
        rows.Should().Be(1, because: "no second record is saved for a non-repeatable badge");
    }

    [Fact]
    public async Task Handle_RepeatableBadgeAlreadyEarned_AwardsAnotherCopyWithoutDisplaySlot()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var badge = await _seeder.CreateBadgeAsync("Early bird", isRepeatable: true);
        await _seeder.CreateUserBadgeAsync(userId, badge.Id, DateTimeOffset.UtcNow.AddDays(-1), displayOrder: 0);

        // Act
        var awarded = await _handler.Handle(new AwardNewBadgesToUserCommand
        {
            UserId = userId,
            BadgeIds = [badge.Id]
        }, CancellationToken.None);

        var rows = await _context.UserBadges
            .Where(ub => ub.UserId == userId && ub.BadgeId == badge.Id)
            .OrderBy(ub => ub.EarnedAtUtc)
            .ToListAsync();

        // Assert
        awarded.Should().ContainSingle(b => b.BadgeId == badge.Id,
            because: "a repeatable badge is awarded again, so the user is notified again");
        rows.Should().HaveCount(2, because: "every award of a repeatable badge keeps its own history record");
        rows[1].DisplayOrder.Should().BeNull(
            because: "a repeat copy must not take a second display slot for the same badge");
    }

    [Fact]
    public async Task Handle_NewBadgeAfterRepeatCopies_FillsNextFreeSlot()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var repeatable = await _seeder.CreateBadgeAsync("Early bird", isRepeatable: true);
        var other = await _seeder.CreateBadgeAsync("Hard worker");
        await _seeder.CreateUserBadgeAsync(userId, repeatable.Id, DateTimeOffset.UtcNow.AddDays(-3), displayOrder: 0);
        await _seeder.CreateUserBadgeAsync(userId, repeatable.Id, DateTimeOffset.UtcNow.AddDays(-2));
        await _seeder.CreateUserBadgeAsync(userId, repeatable.Id, DateTimeOffset.UtcNow.AddDays(-1));

        // Act
        await _handler.Handle(new AwardNewBadgesToUserCommand
        {
            UserId = userId,
            BadgeIds = [other.Id]
        }, CancellationToken.None);

        var newRow = await _context.UserBadges.SingleAsync(ub => ub.UserId == userId && ub.BadgeId == other.Id);

        // Assert
        newRow.DisplayOrder.Should().Be(1,
            because: "the user holds one distinct badge, so three copies of it must not use up the free slots");
    }
}

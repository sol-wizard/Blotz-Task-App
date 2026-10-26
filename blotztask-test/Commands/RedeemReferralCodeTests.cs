using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Modules.Badges.Domain;
using BlotzTask.Modules.Badges.Enum;
using BlotzTask.Modules.Badges.Queries;
using BlotzTask.Modules.Badges.Services;
using BlotzTask.Modules.Referrals.Commands;
using BlotzTask.Modules.Referrals.Domain;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class RedeemReferralCodeTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly RecordingBadgeNotificationService _notifications = new();
    private readonly RedeemReferralCodeCommandHandler _handler;

    public RedeemReferralCodeTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);

        var badgeAwardService = new BadgeAwardService(
            new FindMatchingBadgesHandler(_context, TestDbContextFactory.CreateLogger<FindMatchingBadgesHandler>()),
            new AwardNewBadgesToUserHandler(_context, TestDbContextFactory.CreateLogger<AwardNewBadgesToUserHandler>()),
            new NotifyBadgesToUser(_context, _notifications, TestDbContextFactory.CreateLogger<NotifyBadgesToUser>()));

        _handler = new RedeemReferralCodeCommandHandler(
            _context,
            badgeAwardService,
            new GetBadgeByIdQueryHandler(_context, TestDbContextFactory.CreateLogger<GetBadgeByIdQueryHandler>()),
            TestDbContextFactory.CreateLogger<RedeemReferralCodeCommandHandler>());
    }

    [Fact]
    public async Task Handle_ValidCode_ReturnsRefereeBadgeInTheirLanguageWithoutPush()
    {
        // Arrange
        var badge = await EnsureRefereeBadgeAsync();
        var (_, code) = await CreateReferrerWithCodeAsync();
        var refereeId = await _seeder.CreateUserAsync();
        _context.UserPreferences.Add(new UserPreference { UserId = refereeId, PreferredLanguage = Language.Zh });
        _context.UserPushTokens.Add(new UserPushToken
        {
            UserId = refereeId,
            Token = "ExponentPushToken[test]",
            DeviceId = "test-device",
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _handler.Handle(new RedeemReferralCodeCommand { RefereeUserId = refereeId, Code = code });

        // Assert
        result.Badge.Should().NotBeNull(because: "the referee earns the badge in the redeem request itself");
        result.Badge!.Id.Should().Be(badge.Id, because: "the matched badge is the one returned");
        result.Badge.Name.Should().Be(badge.NameZh, because: "the badge copy follows the referee's preferred language");
        (await _context.UserBadges.CountAsync(ub => ub.UserId == refereeId && ub.BadgeId == badge.Id))
            .Should().Be(1, because: "the badge is saved to the referee's badge wall");
        _notifications.SentCount.Should().Be(0,
            because: "the app shows this badge from the response, so a push would show the pop-up twice");
    }

    [Fact]
    public async Task Handle_SecondRedeem_DoesNotAwardBadgeAgain()
    {
        // Arrange
        var badge = await EnsureRefereeBadgeAsync();
        var (_, code) = await CreateReferrerWithCodeAsync();
        var (_, otherCode) = await CreateReferrerWithCodeAsync();
        var refereeId = await _seeder.CreateUserAsync();
        await _handler.Handle(new RedeemReferralCodeCommand { RefereeUserId = refereeId, Code = code });

        // Act
        var secondRedeem = () => _handler.Handle(new RedeemReferralCodeCommand { RefereeUserId = refereeId, Code = otherCode });

        // Assert
        await secondRedeem.Should().ThrowAsync<InvalidOperationException>(
            because: "a user can redeem only one referral code");
        (await _context.UserBadges.CountAsync(ub => ub.UserId == refereeId && ub.BadgeId == badge.Id))
            .Should().Be(1, because: "the referee badge is earned once only");
    }

    [Fact]
    public async Task Handle_ValidCode_DoesNotGiveRefereeBadgeToReferrer()
    {
        // Arrange
        await EnsureRefereeBadgeAsync();
        var (referrerId, code) = await CreateReferrerWithCodeAsync();
        var refereeId = await _seeder.CreateUserAsync();

        // Act
        var result = await _handler.Handle(new RedeemReferralCodeCommand { RefereeUserId = refereeId, Code = code });

        // Assert
        result.ReferrerUserId.Should().Be(referrerId, because: "the referrer's own badge is still awarded later from this id");
        (await _context.UserBadges.AnyAsync(ub => ub.UserId == referrerId))
            .Should().BeFalse(because: "the redeem request only awards the referee; the referrer's badge runs in the background");
    }

    // Tests in this class share one database, so the badge and its criteria are seeded once.
    private async Task<Badge> EnsureRefereeBadgeAsync()
    {
        var criteria = await _context.BadgeCriteria
            .Include(c => c.Badge)
            .FirstOrDefaultAsync(c => c.TriggerAction == TriggerAction.ReferralCodeUsed);
        if (criteria != null)
            return criteria.Badge;

        var badge = await _seeder.CreateBadgeAsync("High Five");
        badge.NameZh = "默契接拍";
        badge.Category = BadgeCategory.Referral;
        _context.BadgeCriteria.Add(new BadgeCriteria
        {
            BadgeId = badge.Id,
            TriggerAction = TriggerAction.ReferralCodeUsed,
            ConditionKey = EventValueKey.CodeUsed,
            ConditionOperator = ">=",
            ConditionValue = 1
        });
        await _context.SaveChangesAsync();
        return badge;
    }

    private async Task<(Guid ReferrerId, string Code)> CreateReferrerWithCodeAsync()
    {
        var referrerId = await _seeder.CreateUserAsync();
        var code = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        _context.ReferralCodes.Add(new ReferralCode { OwnerUserId = referrerId, Code = code, CreatedAtUtc = DateTime.UtcNow });
        await _context.SaveChangesAsync();
        return (referrerId, code);
    }

    // Stands in for the Expo push API, which the tests must never call.
    private class RecordingBadgeNotificationService : IBadgeNotificationService
    {
        public int SentCount { get; private set; }

        public Task<IReadOnlySet<string>> SendAsync(IEnumerable<ExpoMessage> messages, CancellationToken ct = default)
        {
            SentCount += messages.Count();
            return Task.FromResult<IReadOnlySet<string>>(new HashSet<string>());
        }
    }
}

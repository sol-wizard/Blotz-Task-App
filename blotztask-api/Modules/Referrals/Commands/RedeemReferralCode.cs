using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Enum;
using BlotzTask.Modules.Badges.Queries;
using BlotzTask.Modules.Badges.Services;
using BlotzTask.Modules.Referrals.Domain;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Referrals.Commands;

public class RedeemReferralCodeCommand
{
    public required Guid RefereeUserId { get; init; }
    public required string Code { get; init; }
}

public class RedeemReferralCodeResult
{
    public required Guid ReferrerUserId { get; init; }
    public required BadgeByIdItemDto? Badge { get; init; }
}

public class RedeemReferralCodeCommandHandler(
    BlotzTaskDbContext db,
    BadgeAwardService badgeAwardService,
    GetBadgeByIdQueryHandler getBadgeByIdQueryHandler,
    ILogger<RedeemReferralCodeCommandHandler> logger)
{
    public async Task<RedeemReferralCodeResult> Handle(RedeemReferralCodeCommand command, CancellationToken ct = default)
    {
        var code = command.Code.Trim().ToUpperInvariant();

        var referee = await db.AppUsers.FirstOrDefaultAsync(u => u.Id == command.RefereeUserId, ct)
            ?? throw new NotFoundException("User not found.");

        if (referee.IsOnboarded)
            throw new ForbiddenException("Invite codes can only be redeemed during onboarding.");

        var referralCode = await db.ReferralCodes.FirstOrDefaultAsync(r => r.Code == code, ct)
            ?? throw new NotFoundException("Referral code not found.");

        if (referralCode.OwnerUserId == command.RefereeUserId)
            throw new ArgumentException("You cannot redeem your own referral code.");

        var alreadyRedeemed = await db.Referrals.AnyAsync(r => r.RefereeUserId == command.RefereeUserId, ct);
        if (alreadyRedeemed)
            throw new InvalidOperationException("You have already redeemed a referral code.");

        db.Referrals.Add(new Referral
        {
            ReferrerUserId = referralCode.OwnerUserId,
            RefereeUserId = command.RefereeUserId,
            CodeUsed = code,
            RedeemedAtUtc = DateTime.UtcNow
        });

        await db.SaveChangesAsync(ct);

        logger.LogInformation("User {RefereeUserId} redeemed referral code from {ReferrerUserId}",
            command.RefereeUserId, referralCode.OwnerUserId);

        return new RedeemReferralCodeResult
        {
            ReferrerUserId = referralCode.OwnerUserId,
            Badge = await TryAwardRefereeBadgeAsync(command.RefereeUserId, ct)
        };
    }

    // The badge is returned in the response, not pushed, so the app can show it even with notifications off.
    // The redeem is already saved, so a badge failure must not turn it into an error the user cannot retry.
    private async Task<BadgeByIdItemDto?> TryAwardRefereeBadgeAsync(Guid refereeUserId, CancellationToken ct)
    {
        try
        {
            var awarded = await badgeAwardService.AwardAsync(new BadgeAwardCommand
            {
                UserId = refereeUserId,
                TriggerAction = TriggerAction.ReferralCodeUsed,
                EventValues = new Dictionary<EventValueKey, double>
                {
                    [EventValueKey.CodeUsed] = 1
                }
            }, ct);

            if (awarded.Count == 0)
                return null;

            return await getBadgeByIdQueryHandler.Handle(new GetBadgeByIdQuery
            {
                UserId = refereeUserId,
                BadgeId = awarded[0].BadgeId
            }, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Failed to award the referee badge to user {RefereeUserId}", refereeUserId);
            // Drop the unsaved badge row so a later save in this request can't retry it.
            db.ChangeTracker.Clear();
            return null;
        }
    }
}

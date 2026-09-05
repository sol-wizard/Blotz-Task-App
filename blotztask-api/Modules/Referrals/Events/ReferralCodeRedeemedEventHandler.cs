using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Enum;
using BlotzTask.Modules.Badges.Services;
using BlotzTask.Shared.Events;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Referrals.Events;

public class ReferralCodeRedeemedEventHandler(
    BlotzTaskDbContext db,
    ILogger<ReferralCodeRedeemedEventHandler> logger,
    BadgeAwardService badgeAwardService) : IDomainEventHandler<ReferralCodeRedeemedEvent>
{
    public async Task HandleAsync(ReferralCodeRedeemedEvent domainEvent, CancellationToken ct = default)
    {
        logger.LogInformation(
            "[ReferralCodeRedeemedEventHandler] Started — ReferrerUserId {ReferrerUserId}, RefereeUserId {RefereeUserId}",
            domainEvent.ReferrerUserId, domainEvent.RefereeUserId);

        // No random skip here. The 50% gate in TaskCompletedEventHandler is a deliberate
        // gacha mechanic for task badges; referral tiers are earned once, so a coin flip
        // would silently deny a user the badge they just earned.
        var inviteCount = await db.Referrals
            .CountAsync(r => r.ReferrerUserId == domainEvent.ReferrerUserId, ct);
        
        await badgeAwardService.ProcessAsync(new BadgeAwardCommand
        {
            UserId = domainEvent.ReferrerUserId,
            TriggerAction = TriggerAction.InviteRedeemed,
            EventValues = new Dictionary<EventValueKey, double>
            {
                [EventValueKey.InviteCount] = inviteCount
            }
        }, ct);
    }
}

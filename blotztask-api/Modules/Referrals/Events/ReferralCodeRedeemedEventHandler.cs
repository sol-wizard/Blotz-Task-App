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

        if (Random.Shared.NextDouble() >= 0.5)
        {
            logger.LogInformation(
                "[ReferralCodeRedeemedEventHandler] Skipped referrer badge award (50% chance) — ReferrerUserId {ReferrerUserId}",
                domainEvent.ReferrerUserId);
            return;
        }

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

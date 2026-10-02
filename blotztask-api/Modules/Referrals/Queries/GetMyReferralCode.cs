using BlotzTask.Modules.Referrals.Commands;
using BlotzTask.Modules.Referrals.DTOs;
using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using BlotzTask.Modules.Badges.Enum;

namespace BlotzTask.Modules.Referrals.Queries;

public class GetMyReferralCodeQuery
{
    public required Guid UserId { get; init; }
}

public class GetMyReferralCodeQueryHandler(
    EnsureReferralCodeHandler ensureReferralCode,
    BlotzTaskDbContext db)
{
    public async Task<ReferralCodeDto> Handle(GetMyReferralCodeQuery query, CancellationToken ct = default)
    {
        var referralCode = await ensureReferralCode.HandleAsync(query.UserId, ct);
        var redemptionCount = await db.Referrals.CountAsync(
            referral => referral.ReferrerUserId == query.UserId,
            ct);
        var criteria = await db.BadgeCriteria
            .Include(c => c.Badge)
            .Where(c => c.TriggerAction == TriggerAction.InviteRedeemed
                        && c.ConditionKey == EventValueKey.InviteCount)
            .OrderBy(c => c.ConditionValue)
            .FirstOrDefaultAsync(ct);
        var hasEarnedBadge = criteria is not null && await db.UserBadges.AnyAsync(
            userBadge => userBadge.UserId == query.UserId && userBadge.BadgeId == criteria.BadgeId,
            ct);

        return new ReferralCodeDto
        {
            Code = referralCode.Code!,
            RedemptionCount = redemptionCount,
            TargetCount = criteria?.ConditionValue,
            BadgeIconUrl = criteria?.Badge.IconUrl,
            HasEarnedBadge = hasEarnedBadge
        };
    }
}

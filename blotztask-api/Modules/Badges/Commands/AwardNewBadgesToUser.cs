using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Badges.Commands;

public class AwardNewBadgesToUserCommand
{
    public required Guid UserId { get; init; }
    public required List<int> BadgeIds { get; init; }
}

public class AwardedBadge
{
    public required int BadgeId { get; init; }
    public required DateTimeOffset EarnedAt { get; init; }
}

public class AwardNewBadgesToUserHandler(BlotzTaskDbContext db, ILogger<AwardNewBadgesToUserHandler> logger)
{
    public async Task<List<AwardedBadge>> Handle(AwardNewBadgesToUserCommand command, CancellationToken ct = default)
    {
        if (command.BadgeIds.Count == 0)
            return [];

        var repeatableBadgeIds = await db.Badges
            .Where(b => command.BadgeIds.Contains(b.Id) && b.IsRepeatable)
            .Select(b => b.Id)
            .ToListAsync(ct);

        var alreadyEarned = await db.UserBadges
            .Where(ub => ub.UserId == command.UserId && command.BadgeIds.Contains(ub.BadgeId))
            .Select(ub => ub.BadgeId)
            .Distinct()
            .ToListAsync(ct);

        // A repeatable badge is awarded again on every match; any other badge only once.
        var toAward = command.BadgeIds
            .Where(badgeId => repeatableBadgeIds.Contains(badgeId) || !alreadyEarned.Contains(badgeId))
            .ToList();

        if (toAward.Count == 0)
            return [];

        var earnedAt = DateTimeOffset.UtcNow;

        // Count badges, not rows: repeat copies of one badge share its single place on the wall.
        var nextSlot = await db.UserBadges
            .Where(ub => ub.UserId == command.UserId)
            .Select(ub => ub.BadgeId)
            .Distinct()
            .CountAsync(ct);

        foreach (var badgeId in toAward)
        {
            int? displayOrder = null;

            // A repeat copy never takes a display slot: the first copy already holds the badge's place.
            if (!alreadyEarned.Contains(badgeId))
            {
                displayOrder = nextSlot <= 2 ? nextSlot : null;
                nextSlot++;
            }

            db.UserBadges.Add(new UserBadge
            {
                UserId = command.UserId,
                BadgeId = badgeId,
                EarnedAtUtc = earnedAt,
                DisplayOrder = displayOrder
            });
        }

        await db.SaveChangesAsync(ct);

        logger.LogInformation("User {UserId} awarded {Count} new badge(s): {BadgeIds}",
            command.UserId, toAward.Count, toAward);

        return [.. toAward.Select(badgeId => new AwardedBadge { BadgeId = badgeId, EarnedAt = earnedAt })];
    }
}

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

        var alreadyEarned = await db.UserBadges
            .Where(ub => ub.UserId == command.UserId && command.BadgeIds.Contains(ub.BadgeId))
            .Select(ub => ub.BadgeId)
            .ToListAsync(ct);

        var toAward = command.BadgeIds.Except(alreadyEarned).ToList();

        if (toAward.Count == 0)
            return [];

        var earnedAt = DateTimeOffset.UtcNow;

        // A user who has never curated the achievement preview gets it filled by earned order, so
        // the earliest badges take the slots. The moment they equip or unequip anything the flag
        // flips and new badges wait to be picked instead — see BadgeDisplaySlots.MarkCustomized.
        var preference = await db.UserPreferences.FindAsync(command.UserId, ct);
        var hasCustomized = preference?.HasCustomizedBadgeDisplay ?? false;

        // Occupied slots are always contiguous from 0, so the equipped count is the next free slot.
        var nextSlot = hasCustomized
            ? BadgeDisplaySlots.Count
            : await db.UserBadges.CountAsync(ub => ub.UserId == command.UserId && ub.DisplayOrder != null, ct);

        foreach (var badgeId in toAward)
        {
            int? slot = nextSlot < BadgeDisplaySlots.Count ? nextSlot++ : null;

            db.UserBadges.Add(new UserBadge
            {
                UserId = command.UserId,
                BadgeId = badgeId,
                EarnedAtUtc = earnedAt,
                DisplayOrder = slot
            });
        }

        await db.SaveChangesAsync(ct);

        logger.LogInformation("User {UserId} awarded {Count} new badge(s): {BadgeIds}",
            command.UserId, toAward.Count, toAward);

        return toAward.Select(badgeId => new AwardedBadge { BadgeId = badgeId, EarnedAt = earnedAt }).ToList();
    }
}

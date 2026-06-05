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

        db.UserBadges.AddRange(toAward.Select(badgeId => new UserBadge
        {
            UserId = command.UserId,
            BadgeId = badgeId,
            EarnedAtUtc = earnedAt
        }));

        await db.SaveChangesAsync(ct);

        logger.LogInformation("User {UserId} awarded {Count} new badge(s): {BadgeIds}",
            command.UserId, toAward.Count, toAward);

        return toAward.Select(badgeId => new AwardedBadge { BadgeId = badgeId, EarnedAt = earnedAt }).ToList();
    }
}

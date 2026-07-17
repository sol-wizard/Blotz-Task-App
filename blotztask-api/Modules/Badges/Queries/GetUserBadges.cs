using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Enums;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Badges.Queries;

public class GetUserBadgesQuery
{
    public required Guid UserId { get; init; }
}

public class GetUserBadgesQueryHandler(BlotzTaskDbContext db, ILogger<GetUserBadgesQueryHandler> logger)
{
    public async Task<List<BadgeDto>> Handle(GetUserBadgesQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching badges for user {UserId}", query.UserId);

        var preference = await db.UserPreferences.FindAsync(query.UserId, ct);
        var language = preference?.PreferredLanguage ?? Language.En;

        var earnedBadges = await db.UserBadges
            .Where(ub => ub.UserId == query.UserId)
            .Join(db.Badges,
                ub => ub.BadgeId,
                badge => badge.Id,
                (ub, badge) => new
                {
                    badge.Id,
                    badge.IconUrl,
                    badge.NameEn,
                    badge.NameZh,
                    ub.EarnedAtUtc
                })
            .OrderBy(b => b.EarnedAtUtc)
            .ToListAsync(ct);

        var badges = earnedBadges
            .Select((badge, index) => new BadgeDto
            {
                Id = badge.Id,
                Name = language == Language.Zh ? badge.NameZh : badge.NameEn,
                IconUrl = badge.IconUrl,
                DisplayOrder = index
            })
            .ToList();

        logger.LogInformation("Fetched {Count} badges for user {UserId}", badges.Count, query.UserId);
        return badges;
    }
}

public class BadgeDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string IconUrl { get; set; }
    public int DisplayOrder { get; set; }
}

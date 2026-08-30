using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Enums;
using Microsoft.EntityFrameworkCore;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.Badges.Queries;

public class GetBadgeByIdQuery
{
    public required Guid UserId { get; init; }
    public required int BadgeId { get; init; }
}

public class GetBadgeByIdQueryHandler(BlotzTaskDbContext db, ILogger<GetBadgeByIdQueryHandler> logger)
{
    public async Task<BadgeByIdItemDto> Handle(GetBadgeByIdQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching badges for UserId {UserId}", query.UserId);

        var preference = await db.UserPreferences.FindAsync(query.UserId, ct);
        var language = preference?.PreferredLanguage ?? Language.En;

        // Only badges the user has actually earned are returned, so the obtained date is always available.
        var earnedBadge = await db.UserBadges
            .Where(ub => ub.UserId == query.UserId && ub.BadgeId == query.BadgeId)
            .Join(db.Badges,
                ub => ub.BadgeId,
                badge => badge.Id,
                (ub, badge) => new { Badge = badge, ub.EarnedAtUtc, EquippedSlot = ub.DisplayOrder })
            .FirstOrDefaultAsync(ct);

        if (earnedBadge == null)
            throw new NotFoundException($"Badge with ID {query.BadgeId} not found for the current user.");

        return new BadgeByIdItemDto
        {
            Id = earnedBadge.Badge.Id,
            Name = language == Language.Zh ? earnedBadge.Badge.NameZh : earnedBadge.Badge.NameEn,
            Description = language == Language.Zh ? earnedBadge.Badge.DescriptionZh : earnedBadge.Badge.DescriptionEn,
            IconUrl = earnedBadge.Badge.IconUrl,
            Category = earnedBadge.Badge.Category.ToString(),
            ObtainedAt = earnedBadge.EarnedAtUtc,
            EquippedSlot = earnedBadge.EquippedSlot,
        };
    }
}

public class BadgeByIdItemDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    public required string IconUrl { get; set; }
    public required string Category { get; set; }
    public required DateTimeOffset ObtainedAt { get; set; }
    public int? EquippedSlot { get; set; }
}
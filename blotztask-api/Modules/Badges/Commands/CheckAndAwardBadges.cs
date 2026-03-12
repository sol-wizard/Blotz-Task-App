using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Domain;
using BlotzTask.Modules.Badges.Enum;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Badges.Commands;

public class CheckAndAwardBadgesCommand
{
    public required Guid UserId { get; init; }
    public required BadgeCategory Category { get; init; }
    public required int CurrentValue { get; init; }
}

public class CheckAndAwardBadgesCommandHandler(BlotzTaskDbContext db, ILogger<CheckAndAwardBadgesCommandHandler> logger)
{
    public async Task<List<NewlyEarnedBadgeDto>> Handle(CheckAndAwardBadgesCommand command, CancellationToken ct = default)
    {
        var hasUnearned = await db.Badges
            .AnyAsync(b => b.Category == command.Category
                        && b.IsActive
                        && !db.UserBadges.Any(ub => ub.UserId == command.UserId && ub.BadgeId == b.Id), ct);

        if (!hasUnearned)
        {
            logger.LogInformation("User {UserId} has earned all badges in category {Category} — skipping", command.UserId, command.Category);
            return [];
        }

        logger.LogInformation("Checking badges for user {UserId}, category {Category}, value {Value}",
            command.UserId, command.Category, command.CurrentValue);

        var newlyEarned = await db.Badges
            .Where(b => b.Category == command.Category
                     && b.IsActive
                     && b.Threshold.HasValue
                     && b.Threshold.Value <= command.CurrentValue
                     && !db.UserBadges.Any(ub => ub.UserId == command.UserId && ub.BadgeId == b.Id))
            .ToListAsync(ct);

        if (newlyEarned.Count == 0)
            return [];

        db.UserBadges.AddRange(newlyEarned.Select(b => new UserBadge
        {
            UserId = command.UserId,
            BadgeId = b.Id,
            EarnedAtUtc = DateTime.UtcNow
        }));

        await db.SaveChangesAsync(ct);

        logger.LogInformation("User {UserId} earned {Count} new badge(s)", command.UserId, newlyEarned.Count);

        return [.. newlyEarned.Select(b => new NewlyEarnedBadgeDto
        {
            Id = b.Id,
            Name = b.Name,
            Description = b.Description,
            IconUrl = b.IconUrl
        })];
    }
}

public class NewlyEarnedBadgeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IconUrl { get; set; } = string.Empty;
}

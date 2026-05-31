using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Enums;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Badges.Services;

public class NotifyBadgesToUser(
    BlotzTaskDbContext db,
    IBadgeNotificationService notificationService,
    ILogger<NotifyBadgesToUser> logger)
{
    public async Task HandleAsync(Guid userId, List<int> badgeIds, CancellationToken ct = default)
    {
        if (badgeIds.Count == 0) return;

        var badges = await db.Badges
            .Where(b => badgeIds.Contains(b.Id))
            .ToListAsync(ct);

        if (badges.Count == 0)
        {
            logger.LogWarning("None of badge IDs {BadgeIds} found, skipping notification.", string.Join(", ", badgeIds));
            return;
        }

        var pushTokens = await db.UserPushTokens
            .Where(t => t.UserId == userId)
            .Select(t => t.Token)
            .ToListAsync(ct);

        if (pushTokens.Count == 0)
        {
            logger.LogInformation("No push tokens for user {UserId}, skipping notification.", userId);
            return;
        }

        var language = await LoadPreferredLanguageAsync(userId, ct);

        var isEnglish = language == Language.En;
        var title = isEnglish ? "You have received a new badge" : "你收到了一个新的奖章";

        // One message per badge, with all tokens in the `to` array
        var messages = badges.Select(badge => new ExpoMessage(
            To: pushTokens,
            Title: title,
            Body: isEnglish ? badge.NameEn : badge.NameZh,
            Data: new { type = "badge", badgeId = badge.Id, iconUrl = badge.IconUrl, description = isEnglish ? badge.DescriptionEn : badge.DescriptionZh }
        ));

        var deadTokens = await notificationService.SendAsync(messages, ct);

        logger.LogInformation("Sent {BadgeCount} badge notification(s) to {TokenCount} device(s) for user {UserId}.",
            badges.Count, pushTokens.Count, userId);

        if (deadTokens.Count > 0)
        {
            var toRemove = await db.UserPushTokens
                .Where(t => deadTokens.Contains(t.Token))
                .ToListAsync(ct);

            db.UserPushTokens.RemoveRange(toRemove);
            await db.SaveChangesAsync(ct);

            logger.LogInformation("Deleted {Count} dead push token(s).", deadTokens.Count);
        }
    }

    private Task<Language> LoadPreferredLanguageAsync(Guid userId, CancellationToken ct) =>
        db.UserPreferences
            .Where(p => p.UserId == userId)
            .Select(p => p.PreferredLanguage)
            .FirstOrDefaultAsync(ct);
}

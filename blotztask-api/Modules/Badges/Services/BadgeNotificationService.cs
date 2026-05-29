using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Enums;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Badges.Services;

public interface IBadgeNotificationService
{
    Task SendBadgeNotificationsAsync(Guid userId, List<int> badgeIds, CancellationToken ct = default);
}

public class BadgeNotificationService(
    BlotzTaskDbContext db,
    IHttpClientFactory httpClientFactory,
    ILogger<BadgeNotificationService> logger) : IBadgeNotificationService
{

    public async Task SendBadgeNotificationsAsync(Guid userId, List<int> badgeIds, CancellationToken ct = default)
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

        var language = await db.UserPreferences
            .Where(p => p.UserId == userId)
            .Select(p => p.PreferredLanguage)
            .FirstOrDefaultAsync(ct);

        var isEnglish = language == Language.En;

        // One message per badge, with all tokens in the `to` array
        var messages = badges.Select(badge => new
        {
            to = pushTokens,
            title = isEnglish ? badge.NameEn : badge.NameZh,
            body = isEnglish ? badge.DescriptionEn : badge.DescriptionZh,
            data = new { badgeId = badge.Id, iconUrl = badge.IconUrl }
        });

        var client = httpClientFactory.CreateClient("Expo");
        var response = await client.PostAsJsonAsync("push/send", messages, ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Expo push failed with {Status} for user {UserId}, badges {BadgeIds}.",
                response.StatusCode, userId, string.Join(", ", badgeIds));
            return;
        }

        logger.LogInformation("Sent {BadgeCount} badge notification(s) to {TokenCount} device(s) for user {UserId}.",
            badges.Count, pushTokens.Count, userId);
    }
}

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
        var title = isEnglish ? "You have received a new badge" : "你收到了一个新的奖章";

        // One message per badge, with all tokens in the `to` array.
        // Expo expands each message into one ticket per token, in the same order.
        // So the ticket sequence matches: badges.SelectMany(_ => pushTokens).
        var messages = badges.Select(badge => new
        {
            to = pushTokens,
            title,
            body = isEnglish ? badge.NameEn : badge.NameZh,
            data = new { type = "badge", badgeId = badge.Id, iconUrl = badge.IconUrl, description = isEnglish ? badge.DescriptionEn : badge.DescriptionZh }
        });

        var client = httpClientFactory.CreateClient("Expo");
        var response = await client.PostAsJsonAsync("push/send", messages, ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Expo push failed with {Status} for user {UserId}.", response.StatusCode, userId);
            return;
        }

        logger.LogInformation("Sent {BadgeCount} badge notification(s) to {TokenCount} device(s) for user {UserId}.",
            badges.Count, pushTokens.Count, userId);

        var result = await response.Content.ReadFromJsonAsync<ExpoSendResponse>(ct);
        if (result is not null)
            await DeleteDeadTokensAsync(result.Data, [.. badges.SelectMany(_ => pushTokens)], ct);
    }

    private async Task DeleteDeadTokensAsync(List<ExpoPushTicket> tickets, List<string> orderedTokens, CancellationToken ct)
    {
        var deadTokens = tickets
            .Zip(orderedTokens)
            .Where(p => p.First.Details?.GetValueOrDefault("error") == "DeviceNotRegistered")
            .Select(p => p.Second)
            .ToHashSet();

        if (deadTokens.Count == 0) return;

        var toRemove = await db.UserPushTokens
            .Where(t => deadTokens.Contains(t.Token))
            .ToListAsync(ct);

        db.UserPushTokens.RemoveRange(toRemove);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Deleted {Count} dead push token(s).", deadTokens.Count);
    }
}

record ExpoPushTicket(Dictionary<string, string>? Details);
record ExpoSendResponse(List<ExpoPushTicket> Data);

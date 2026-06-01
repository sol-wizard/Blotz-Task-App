namespace BlotzTask.Modules.Badges.Services;

public record ExpoMessage(List<string> To, string Title, string Body, object Data);

public interface IBadgeNotificationService
{
    Task<IReadOnlySet<string>> SendAsync(IEnumerable<ExpoMessage> messages, CancellationToken ct = default);
}

public class BadgeNotificationService(
    IHttpClientFactory httpClientFactory,
    ILogger<BadgeNotificationService> logger) : IBadgeNotificationService
{
    public async Task<IReadOnlySet<string>> SendAsync(IEnumerable<ExpoMessage> messages, CancellationToken ct = default)
    {
        var messageList = messages.ToList();

        var client = httpClientFactory.CreateClient("Expo");
        var response = await client.PostAsJsonAsync("push/send", messageList, ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Expo push failed with {Status}.", response.StatusCode);
            return new HashSet<string>();
        }

        var result = await response.Content.ReadFromJsonAsync<ExpoSendResponse>(ct);
        if (result is null) return new HashSet<string>();

        // Expo expands each message's `to` array in order, so tickets map to messageList.SelectMany(m => m.To)
        var orderedTokens = messageList.SelectMany(m => m.To).ToList();
        return result.Data
            .Zip(orderedTokens)
            .Where(p => p.First.Details?.GetValueOrDefault("error") == "DeviceNotRegistered")
            .Select(p => p.Second)
            .ToHashSet();
    }
}

record ExpoPushTicket(Dictionary<string, string>? Details);
record ExpoSendResponse(List<ExpoPushTicket> Data);

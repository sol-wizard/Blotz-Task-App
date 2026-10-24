using System.Text.Json;
using BlotzTask.Extension.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace BlotzTask.Shared.Lark;

public interface ILarkTokenService
{
    Task<string> GetTenantAccessTokenAsync(CancellationToken ct = default);
}

public sealed class LarkTokenService(
    HttpClient httpClient,
    IOptions<LarkOptions> options,
    IMemoryCache cache,
    ILogger<LarkTokenService> logger) : ILarkTokenService
{
    private const string CacheKey = "lark_tenant_access_token";
    private const string TokenUrl = "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal";

    public async Task<string> GetTenantAccessTokenAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue(CacheKey, out string? cached) && cached is not null)
            return cached;

        var payload = new { app_id = options.Value.AppId, app_secret = options.Value.AppSecret };
        var response = await httpClient.PostAsJsonAsync(TokenUrl, payload, ct);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        var code = body.GetProperty("code").GetInt32();
        if (code != 0)
        {
            logger.LogError("Lark token fetch failed with code {Code}: {Msg}", code,
                body.GetProperty("msg").GetString());
            throw new InvalidOperationException($"Lark tenant token fetch failed (code {code})");
        }

        var token = body.GetProperty("tenant_access_token").GetString()!;
        var expireSeconds = body.GetProperty("expire").GetInt32();

        cache.Set(CacheKey, token, TimeSpan.FromSeconds(expireSeconds - 300));

        logger.LogInformation("Lark tenant access token refreshed, expires in {Seconds}s", expireSeconds);
        return token;
    }
}

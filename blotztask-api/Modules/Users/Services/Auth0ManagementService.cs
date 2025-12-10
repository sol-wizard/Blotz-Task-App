using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using BlotzTask.Modules.Users.Dtos;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.Users.Services;

public interface IAuth0ManagementService
{
    Task UpdateUserProfileAsync(string auth0UserId, string? displayName,
        CancellationToken ct = default);
}

public class Auth0ManagementService : IAuth0ManagementService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<Auth0ManagementService> _logger;
    private readonly Auth0ManagementSettings _settings;

    private string? _cachedToken;
    private DateTime _tokenExpiresAtUtc;

    public Auth0ManagementService(
        HttpClient httpClient,
        IOptions<Auth0ManagementSettings> settings,
        ILogger<Auth0ManagementService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task UpdateUserProfileAsync(string auth0UserId, string? displayName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(auth0UserId))
            throw new ArgumentException("auth0UserId is required", nameof(auth0UserId));

        var token = await GetAuth0ManagementTokenAsync(ct);

        var request = new HttpRequestMessage(
            HttpMethod.Patch,
            $"{_settings.Audience}users/{Uri.EscapeDataString(auth0UserId)}");

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var body = new Dictionary<string, object>();

        if (!string.IsNullOrWhiteSpace(displayName)) body["name"] = displayName;

        request.Content = new StringContent(
            JsonSerializer.Serialize(body),
            Encoding.UTF8,
            "application/json");

        var response = await _httpClient.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Failed to update Auth0 user {Auth0UserId}. Status: {StatusCode}, Body: {Body}",
                auth0UserId, response.StatusCode, content);

            throw new InvalidOperationException(
                $"Failed to update Auth0 user profile: {response.StatusCode}");
        }

        _logger.LogInformation("Updated Auth0 user profile for {Auth0UserId}", auth0UserId);
    }

    private async Task<string> GetAuth0ManagementTokenAsync(CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(_cachedToken) && DateTime.UtcNow < _tokenExpiresAtUtc) return _cachedToken!;

        var url = $"https://{_settings.Domain}/oauth/token";

        var payload = new
        {
            client_id = _settings.ClientId,
            client_secret = _settings.ClientSecret,
            audience = _settings.Audience,
            grant_type = "client_credentials"
        };

        var response = await _httpClient.PostAsync(
            url,
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
            ct);

        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Failed to get Auth0 management token. Status: {StatusCode}, Body: {Body}",
                response.StatusCode, content);

            throw new InvalidOperationException("Failed to obtain Auth0 management API token.");
        }

        var json = await response.Content.ReadAsStringAsync(ct);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var accessToken = root.GetProperty("access_token").GetString();
        var expiresIn = root.TryGetProperty("expires_in", out var expElem)
            ? expElem.GetInt32()
            : 3600;

        _cachedToken = accessToken;
        _tokenExpiresAtUtc = DateTime.UtcNow.AddSeconds(expiresIn - 60);

        return _cachedToken!;
    }
}
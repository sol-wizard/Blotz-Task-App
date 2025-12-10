using Auth0.AuthenticationApi;
using Auth0.AuthenticationApi.Models;
using Auth0.ManagementApi;
using Auth0.ManagementApi.Models;
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
    private readonly ILogger<Auth0ManagementService> _logger;
    private readonly Auth0ManagementSettings _settings;

    private string? _cachedToken;
    private DateTime _tokenExpiresAtUtc;

    public Auth0ManagementService(
        IOptions<Auth0ManagementSettings> settings,
        ILogger<Auth0ManagementService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task UpdateUserProfileAsync(
        string auth0UserId,
        string? displayName,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(auth0UserId))
            throw new ArgumentException("auth0UserId is required", nameof(auth0UserId));

        if (string.IsNullOrWhiteSpace(displayName))
        {
            _logger.LogInformation("DisplayName is null or empty, skipping Auth0 update for {Auth0UserId}",
                auth0UserId);
            return;
        }

        var token = await GetManagementTokenAsync(ct);

        var managementClient = new ManagementApiClient(
            token,
            new Uri($"https://{_settings.Domain}/api/v2"));

        var updateRequest = new UserUpdateRequest
        {
            FullName = displayName
        };

        try
        {
            await managementClient.Users.UpdateAsync(auth0UserId, updateRequest, ct);
            _logger.LogInformation("Updated Auth0 user profile for {Auth0UserId}", auth0UserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to update Auth0 user {Auth0UserId} with Management API SDK", auth0UserId);
            throw;
        }
    }

    private async Task<string> GetManagementTokenAsync(CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(_cachedToken) && DateTime.UtcNow < _tokenExpiresAtUtc) return _cachedToken!;

        var authClient = new AuthenticationApiClient(
            new Uri($"https://{_settings.Domain}"));

        var tokenRequest = new ClientCredentialsTokenRequest
        {
            ClientId = _settings.ClientId,
            ClientSecret = _settings.ClientSecret,
            Audience = _settings.Audience
        };

        AccessTokenResponse tokenResponse;
        try
        {
            tokenResponse = await authClient.GetTokenAsync(tokenRequest, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to obtain Auth0 management API token via SDK");
            throw new InvalidOperationException("Failed to obtain Auth0 management API token.", ex);
        }

        _cachedToken = tokenResponse.AccessToken;

        _tokenExpiresAtUtc = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn - 60);

        return _cachedToken!;
    }
}
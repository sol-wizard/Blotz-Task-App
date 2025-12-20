using Auth0.AuthenticationApi;
using Auth0.AuthenticationApi.Models;
using Auth0.ManagementApi;
using Auth0.ManagementApi.Models;
using BlotzTask.Modules.Users.Dtos;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.Users.Services;

public interface IAuth0ManagementService
{
    Task UpdateUserProfileAsync(string auth0UserId, string? displayName, string? avatarUrl,
        CancellationToken ct = default);

    Task<User> GetUserAsync(string auth0UserId,
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

    public async Task<User> GetUserAsync(string auth0UserId, CancellationToken ct = default)
    {
        var token = await GetManagementTokenAsync(ct);

        var managementClient = new ManagementApiClient(
            token,
            new Uri(_settings.Audience)
        );
        try
        {
            var user = await managementClient.Users.GetAsync(auth0UserId, cancellationToken: ct);
            _logger.LogInformation("Getting Auth0 user profile for {Auth0UserId}", auth0UserId);
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user{Auth0UserId} from Auth0 API", auth0UserId);
            throw;
        }
    }

    public async Task UpdateUserProfileAsync(
        string auth0UserId,
        string? displayName,
        string? avatarUrl,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(auth0UserId))
            throw new ArgumentException("auth0UserId is required", nameof(auth0UserId));

        if (string.IsNullOrWhiteSpace(displayName) || string.IsNullOrWhiteSpace(avatarUrl))
        {
            _logger.LogInformation(
                "DisplayName or Avatar url is null or empty, skipping Auth0 update for {Auth0UserId}",
                auth0UserId);
            return;
        }

        var token = await GetManagementTokenAsync(ct);

        var managementClient = new ManagementApiClient(
            token,
            new Uri(_settings.Audience));

        var updateRequest = new UserUpdateRequest
        {
            FullName = displayName,
            Picture = avatarUrl
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

        using var authClient = new AuthenticationApiClient(_settings.Domain);

        var token = await authClient.GetTokenAsync(new ClientCredentialsTokenRequest
        {
            Audience = _settings.Audience,
            ClientId = _settings.ClientId,
            ClientSecret = _settings.ClientSecret
        });

        var managementApiAccessToken = token.AccessToken;

        _cachedToken = managementApiAccessToken;

        _tokenExpiresAtUtc = DateTime.UtcNow.AddSeconds(token.ExpiresIn - 60);

        return _cachedToken!;
    }
}
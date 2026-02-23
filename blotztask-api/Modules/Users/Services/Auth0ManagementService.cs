using Auth0.AuthenticationApi;
using Auth0.AuthenticationApi.Models;
using Auth0.ManagementApi;
using BlotzTask.Modules.Users.Dtos;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.Users.Services;

public interface IAuth0ManagementService
{
    Task DeleteUserAsync(string auth0UserId, CancellationToken ct = default);
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

    public async Task DeleteUserAsync(string auth0UserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(auth0UserId))
            throw new ArgumentException("auth0UserId is required", nameof(auth0UserId));

        var token = await GetManagementTokenAsync(ct);
        var managementClient = new ManagementApiClient(
            token,
            new Uri(_settings.Audience));

        try
        {
            await managementClient.Users.DeleteAsync(auth0UserId, ct);
            _logger.LogInformation("Deleted Auth0 user {Auth0UserId}", auth0UserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete Auth0 user {Auth0UserId}", auth0UserId);
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

        _logger.LogInformation(
            "Auth0 management token loaded. TokenLoaded={TokenLoaded}, Audience={Audience}, ClientId={ClientId}, ClientSecretLength={ClientSecretLength}",
            !string.IsNullOrWhiteSpace(managementApiAccessToken),
            _settings.Audience,
            _settings.ClientId,
            _settings.ClientSecret?.Length ?? 0);

        _cachedToken = managementApiAccessToken;

        _tokenExpiresAtUtc = DateTime.UtcNow.AddSeconds(token.ExpiresIn - 60);

        return _cachedToken!;
    }
}

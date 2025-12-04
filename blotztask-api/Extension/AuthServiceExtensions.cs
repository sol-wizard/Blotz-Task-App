using BlotzTask.Shared.DTOs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace BlotzTask.Extension;

public static class AuthServiceExtensions
{
    public static IServiceCollection AddAuth0(this IServiceCollection services, IConfiguration configuration)
    {
        var auth0Settings = configuration.GetSection("Auth0").Get<Auth0Settings>();

        var metadataAddress = $"{auth0Settings.Authority}.well-known/openid-configuration";

        var configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            metadataAddress,
            new OpenIdConnectConfigurationRetriever());

        configManager.AutomaticRefreshInterval = TimeSpan.FromHours(48);

        services.AddSingleton<IConfigurationManager<OpenIdConnectConfiguration>>(configManager);

        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.Authority = auth0Settings.Authority;
                options.Audience = auth0Settings.Audience;
                options.ConfigurationManager = configManager;
                options.AutomaticRefreshInterval = TimeSpan.FromHours(48);
            });

        services.AddAuthorization();
        services.AddHostedService<OidcWarmupHostedService>();
        return services;
    }
}

public class OidcWarmupHostedService : IHostedService
{
    private readonly IConfigurationManager<OpenIdConnectConfiguration> _configManager;
    private readonly ILogger<OidcWarmupHostedService> _logger;

    public OidcWarmupHostedService(
        IConfigurationManager<OpenIdConnectConfiguration> configManager,
        ILogger<OidcWarmupHostedService> logger)
    {
        _configManager = configManager;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _configManager.GetConfigurationAsync(cancellationToken);
            _logger.LogInformation("✅ OIDC metadata preloaded.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "⚠️ Failed to preload OIDC metadata.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
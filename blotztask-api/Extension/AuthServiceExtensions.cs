using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace BlotzTask.Extension;

public static class AuthServiceExtensions
{
    public static IServiceCollection AddAuth0JwtBearerAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var auth0Domain = configuration["Auth0:Domain"];
        var auth0Audience = configuration["Auth0:Audience"];
        var auth0CustomDomain = configuration["Auth0:CustomDomain"];

        if (string.IsNullOrWhiteSpace(auth0Domain) || string.IsNullOrWhiteSpace(auth0Audience))
        {
            throw new InvalidOperationException("Missing Auth0 configuration. Please set Auth0:Domain and Auth0:Audience.");
        }

        // Tokens carry the domain the app logged in through as `iss`. Apps built before the
        // custom domain still log in through the tenant domain, so both issuers stay valid.
        // The signing keys are the same set either way, so discovery keeps using the tenant domain.
        var validIssuers = new List<string> { $"https://{auth0Domain}/" };
        if (!string.IsNullOrWhiteSpace(auth0CustomDomain))
        {
            validIssuers.Add($"https://{auth0CustomDomain}/");
        }

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = $"https://{auth0Domain}/";
                options.Audience = auth0Audience;
                options.AutomaticRefreshInterval = TimeSpan.FromHours(72);

                options.TokenValidationParameters.ValidIssuers = validIssuers;

                // Align claim mapping with how we resolve Auth0 user id later
                options.TokenValidationParameters.NameClaimType = ClaimTypes.NameIdentifier;
            });

        services.AddAuthorization();

        return services;
    }
}

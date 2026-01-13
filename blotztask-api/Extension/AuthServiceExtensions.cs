using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace BlotzTask.Extension;

public static class AuthServiceExtensions
{
    public static IServiceCollection AddAuth0JwtBearerAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var auth0Domain = configuration["Auth0:Domain"];
        var auth0Audience = configuration["Auth0:Audience"];

        if (string.IsNullOrWhiteSpace(auth0Domain) || string.IsNullOrWhiteSpace(auth0Audience))
        {
            throw new InvalidOperationException("Missing Auth0 configuration. Please set Auth0:Domain and Auth0:Audience.");
        }

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = $"https://{auth0Domain}/";
                options.Audience = auth0Audience;
                options.AutomaticRefreshInterval = TimeSpan.FromHours(72);

                // Align claim mapping with how we resolve Auth0 user id later
                options.TokenValidationParameters.NameClaimType = ClaimTypes.NameIdentifier;
            });

        services.AddAuthorization();

        return services;
    }
}


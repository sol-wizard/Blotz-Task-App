using BlotzTask.Shared.DTOs;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace BlotzTask.Extension
{
    public static class AuthServiceExtensions
    {
        public static IServiceCollection AddAuth0(this IServiceCollection services, IConfiguration configuration)
        {
            var auth0Settings = configuration.GetSection("Auth0").Get<Auth0Settings>();

            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(options =>
                {
                    options.Authority = auth0Settings.Authority;
                    options.Audience  = auth0Settings.Audience;
                });

            services.AddAuthorization();
            return services;
        }
    }
}
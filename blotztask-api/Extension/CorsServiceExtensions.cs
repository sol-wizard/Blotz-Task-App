namespace BlotzTask.Extension;

public static class CorsServiceExtensions
{
    public static IServiceCollection AddCustomCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("AllowSpecificOrigin",
                builder =>
                {
                    builder.WithOrigins("http://localhost:3000") // devtools (local only)
                        .WithMethods("GET", "POST", "OPTIONS", "PUT", "DELETE")
                        .WithHeaders("Content-Type", "Authorization", "x-signalr-user-agent",
                            "x-requested-with")
                        .AllowCredentials();
                });
        });

        return services;
    }
}


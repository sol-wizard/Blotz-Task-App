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
                    builder.WithOrigins("http://localhost:3000", // DEV frontend origin
                            "http://localhost:8081", // DEV mobile app origin
                            "https://blotz-task-app.vercel.app") // Prod frontend origin    
                        .WithMethods("GET", "POST", "OPTIONS", "PUT", "DELETE")
                        .WithHeaders("Content-Type", "Authorization", "x-signalr-user-agent",
                            "x-requested-with")
                        .AllowCredentials();
                });
        });

        return services;
    }
}


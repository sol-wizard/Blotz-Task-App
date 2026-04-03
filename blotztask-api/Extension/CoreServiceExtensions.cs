using System.Text.Json.Serialization;

namespace BlotzTask.Extension;

public static class CoreServiceExtensions
{
    public static IServiceCollection AddCoreServices(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.AddSignalR(options =>
        {
            options.MaximumReceiveMessageSize = 4 * 1024 * 1024; // 4 MB, supports up to ~1 min WAV audio
        });
        services.AddControllers()
            .AddJsonOptions(options =>
            {
                // Convert enums to strings in JSON (e.g., "En" instead of 0)
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });
        services.AddHealthChecks()
            .AddDbContextCheck<Infrastructure.Data.BlotzTaskDbContext>("database");
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();

        return services;
    }
}


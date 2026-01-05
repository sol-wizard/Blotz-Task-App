using System.Text.Json.Serialization;

namespace BlotzTask.Extension;

public static class CoreServiceExtensions
{
    public static IServiceCollection AddCoreServices(this IServiceCollection services)
    {
        services.AddSignalR();
        services.AddControllers()
            .AddJsonOptions(options =>
            {
                // Convert enums to strings in JSON (e.g., "En" instead of 0)
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });
        services.AddHealthChecks();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();

        return services;
    }
}


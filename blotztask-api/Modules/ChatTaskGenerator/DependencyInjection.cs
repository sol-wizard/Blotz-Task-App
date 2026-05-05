using BlotzTask.Modules.ChatTaskGenerator.DevTools;
using BlotzTask.Modules.ChatTaskGenerator.Services;

namespace BlotzTask.Modules.ChatTaskGenerator;

public static class DependencyInjection
{
    public static IServiceCollection AddChatTaskGeneratorModule(this IServiceCollection services)
    {
        services.AddScoped<IAiTaskGenerateService, AiChatService>();
        services.AddScoped<DateTimeResolveService>();
        services.AddScoped<SpeechTranscriptionService>();
        services.AddScoped<IAiQualityCheckService, AiQualityCheckService>();

        services.AddScoped<AiHubFilter>();

        return services;
    }
}

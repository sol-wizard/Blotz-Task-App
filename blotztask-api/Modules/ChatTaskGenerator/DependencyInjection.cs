using BlotzTask.Modules.ChatTaskGenerator.DevTools;
using BlotzTask.Modules.ChatTaskGenerator.Services;

namespace BlotzTask.Modules.ChatTaskGenerator;

public static class DependencyInjection
{
    public static IServiceCollection AddChatTaskGeneratorModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddScoped<IAiTaskGenerateService, AiTaskGenerateService>();
        services.AddScoped<DateTimeResolveService>();
        services.AddScoped<SpeechTranscriptionService>();
        services.AddScoped<IAiEvalService, AiEvalService>();

        return services;
    }
}
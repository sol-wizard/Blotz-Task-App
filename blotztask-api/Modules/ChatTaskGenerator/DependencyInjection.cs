using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Shared.Store;

namespace BlotzTask.Modules.ChatTaskGenerator;

public static class DependencyInjection
{
    public static IServiceCollection AddChatTaskGeneratorModule(this IServiceCollection services)
    {
        services.AddScoped<IChatHistoryManagerService, ChatHistoryManagerService>();
        services.AddScoped<IAiTaskGenerateService, AiTaskGenerateService>();
        services.AddSingleton<IRealtimeSpeechRecognitionService, RealtimeSpeechRecognitionService>();

        services.AddSingleton(new ChatHistoryStore(
            TimeSpan.FromMinutes(30), // Sessions expire after 30 minutes of inactivity
            TimeSpan.FromMinutes(5) // Scanning every 5 minutes
        ));

        return services;
    }
}

using BlotzTask.Modules.ChatTaskGenerator.Services;

namespace BlotzTask.Modules.ChatTaskGenerator;

public static class DependencyInjection
{
    public static IServiceCollection AddChatTaskGeneratorModule(this IServiceCollection services)
    {
        services.AddScoped<IChatHistoryManagerService, ChatHistoryManagerService>();
        services.AddScoped<IAiTaskGenerateService, AiTaskGenerateService>();

        return services;
    }
}

using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Shared.Store;

namespace BlotzTask.Modules.ChatTaskGenerator;

public static class DependencyInjection
{
    public static IServiceCollection AddChatTaskGeneratorModule(this IServiceCollection services)
    {
        services.AddScoped<IAiTaskGenerateService, AiTaskGenerateService>();
        services.AddScoped<DateTimeResolveService>();

        services.AddSingleton(new ChatHistoryStore(
            TimeSpan.FromMinutes(30),
            TimeSpan.FromMinutes(5)
        ));

        return services;
    }
}

using Azure.AI.Projects;
using BlotzTask.Modules.ChatTaskGenerator.Clients;
using BlotzTask.Modules.ChatTaskGenerator.DevTools;
using BlotzTask.Modules.ChatTaskGenerator.Services;

namespace BlotzTask.Modules.ChatTaskGenerator;

public static class DependencyInjection
{
    public static IServiceCollection AddChatTaskGeneratorModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var deploymentId = configuration["AzureOpenAI:AiModels:TaskGeneration:DeploymentId"]
            ?? throw new InvalidOperationException("Missing AzureOpenAI:AiModels:TaskGeneration:DeploymentId config.");
        services.AddSingleton(sp => new TaskClient(sp.GetRequiredService<AIProjectClient>(), deploymentId));
        services.AddScoped<IAiTaskGenerateService, AiTaskGenerateService>();
        services.AddScoped<DateTimeResolveService>();
        services.AddScoped<SpeechTranscriptionService>();
        services.AddScoped<IAiQualityCheckService, AiQualityCheckService>();
        services.AddScoped<IAiContextInitializeService, AiContextInitializeService>();

        return services;
    }
}
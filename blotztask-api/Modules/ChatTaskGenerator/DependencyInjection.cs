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
        var taskDeploymentId = configuration["AzureOpenAI:AiModels:TaskGeneration:DeploymentId"] 
                               ?? throw new InvalidOperationException("Missing AzureOpenAI:AiModels:TaskGeneration:DeploymentId config.");
        var speechDeploymentId = configuration["AzureOpenAI:AiModels:Speech:DeploymentId"] 
                                 ?? throw new InvalidOperationException("Missing AzureOpenAI:AiModels:Speech:DeploymentId config.");
        var endpoint = configuration["AzureOpenAI:Endpoint"] 
                       ?? throw new InvalidOperationException("Missing AzureOpenAI:Endpoint config.");
        var apiKey = configuration["AzureOpenAI:ApiKey"] 
                     ?? throw new InvalidOperationException("Missing AzureOpenAI:ApiKey config.");
        
        services.AddSingleton(sp => new TaskClient(sp.GetRequiredService<AIProjectClient>(), taskDeploymentId));
        services.AddSingleton(new TranscriptClient(endpoint, apiKey, speechDeploymentId));
        services.AddScoped<IAiTaskGenerateService, AiTaskGenerateService>();
        services.AddScoped<DateTimeResolveService>();
        services.AddScoped<SpeechTranscriptionService>();
        services.AddScoped<IAiQualityCheckService, AiQualityCheckService>();
        services.AddScoped<IAiContextInitializeService, AiContextInitializeService>();

        return services;
    }
}
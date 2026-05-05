using Azure;
using Azure.AI.OpenAI;
using Azure.AI.Projects;
using Azure.Identity;

namespace BlotzTask.Extension;

public static class AgentFrameworkServiceExtensions
{
    public class AzureAIOptions
    {
        public required string Endpoint { get; init; }
        public required string ApiKey { get; init; }
        public required string TaskGenerationDeploymentId { get; init; }
        public required string BreakdownDeploymentId { get; init; }
        public required string SpeechDeploymentId { get; init; }
    }

    public static IServiceCollection AddAgentFrameworkServices(
        this IServiceCollection services, IConfiguration configuration)
    {
        var options = new AzureAIOptions
        {
            Endpoint = configuration["AzureOpenAI:Endpoint"]
                ?? throw new InvalidOperationException("Missing AzureOpenAI:Endpoint"),
            ApiKey = configuration["AzureOpenAI:ApiKey"]
                ?? throw new InvalidOperationException("Missing AzureOpenAI:ApiKey"),
            TaskGenerationDeploymentId = configuration["AzureOpenAI:AiModels:TaskGeneration:DeploymentId"]
                ?? throw new InvalidOperationException("Missing AzureOpenAI:AiModels:TaskGeneration:DeploymentId"),
            BreakdownDeploymentId = configuration["AzureOpenAI:AiModels:Breakdown:DeploymentId"]
                ?? throw new InvalidOperationException("Missing AzureOpenAI:AiModels:Breakdown:DeploymentId"),
            SpeechDeploymentId = configuration["AzureOpenAI:AiModels:Speech:DeploymentId"]
                ?? throw new InvalidOperationException("Missing AzureOpenAI:AiModels:Speech:DeploymentId"),
        };

        // AIProjectClient is shared — one client, multiple deployment targets.
        // AIAgent is NOT created here because instructions are user-specific
        // (language + local time) and must be set per-session in the service layer.
        var azureClient = new AzureOpenAIClient(new Uri(options.Endpoint), new AzureKeyCredential(options.ApiKey));
        var projectClient = new AIProjectClient(new Uri(options.Endpoint), new DefaultAzureCredential());

        services.AddSingleton(options);
        services.AddSingleton(projectClient);
        services.AddSingleton(azureClient.GetAudioClient(options.SpeechDeploymentId));

        return services;
    }
}

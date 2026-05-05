using Azure;
using Azure.AI.OpenAI;
using Azure.AI.Projects;
using Azure.Identity;

namespace BlotzTask.Extension;

public static class AgentFrameworkServiceExtensions
{
    public static IServiceCollection AddAgentFrameworkServices(
        this IServiceCollection services, IConfiguration configuration)
    {
        var endpoint = configuration["AzureOpenAI:Endpoint"]?? throw new InvalidOperationException("Missing AzureOpenAI:Endpoint");
        var taskDeploymentId = configuration["AzureOpenAI:AiModels:TaskGeneration:DeploymentId"]?? throw new InvalidOperationException("Missing task deployment id");;
        var transcriptDeploymentId = configuration["AzureOpenAI:AiModels:Speech:DeploymentId"]??  throw new InvalidOperationException("Missing transcript deployment id");;
        var apiKey = configuration["AzureOpenAI:ApiKey"]?? throw new InvalidOperationException("Missing api key");
        

        // AIProjectClient is shared — one client, two deployment targets.
        // AIAgent is NOT created here because instructions are user-specific
        // (language + local time) and must be set per-session in the service layer.
        var client = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
        var audioClient = client.GetAudioClient(transcriptDeploymentId);
        var projectClient = new AIProjectClient(new Uri(endpoint), new DefaultAzureCredential());
        services.AddSingleton(projectClient);
        services.AddSingleton(audioClient);
        

        return services;
    }
}

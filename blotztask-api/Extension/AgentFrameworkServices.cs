using Azure.AI.Projects;
using Azure.Identity;

namespace BlotzTask.Extension;

public static class AgentFrameworkServiceExtensions
{
    public static IServiceCollection AddAgentFrameworkServices(
        this IServiceCollection services, IConfiguration configuration)
    {
        var projectEndpoint = configuration["AzureAI:ProjectEndpoint"];
        var taskGenerationDeploymentId = configuration["AzureOpenAI:AiModels:TaskGeneration:DeploymentId"];
        var breakdownDeploymentId = configuration["AzureOpenAI:AiModels:Breakdown:DeploymentId"];

        if (string.IsNullOrWhiteSpace(projectEndpoint) ||
            string.IsNullOrWhiteSpace(taskGenerationDeploymentId) ||
            string.IsNullOrWhiteSpace(breakdownDeploymentId))
        {
            throw new InvalidOperationException(
                "Missing Azure AI configuration. Set AzureAI:ProjectEndpoint, AzureOpenAI:AiModels:TaskGeneration:DeploymentId, and AzureOpenAI:AiModels:Breakdown:DeploymentId in configuration.");
        }

        // AIProjectClient is shared — one client, two deployment targets.
        // AIAgent is NOT created here because instructions are user-specific
        // (language + local time) and must be set per-session in the service layer.
        var projectClient = new AIProjectClient(new Uri(projectEndpoint), new DefaultAzureCredential());
        services.AddSingleton(projectClient);

        return services;
    }
}

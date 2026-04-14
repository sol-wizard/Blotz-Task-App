using Azure.AI.Projects;
using Azure.Identity;

namespace BlotzTask.Extension;

public static class AgentFrameworkServiceExtensions
{
    public static IServiceCollection AddAgentFrameworkServices(
        this IServiceCollection services, IConfiguration configuration)
    {
        // AIProjectClient is shared — one client, two deployment targets.
        // AIAgent is NOT created here because instructions are user-specific
        // (language + local time) and must be set per-session in the service layer.
        services.AddSingleton(sp =>
        {
            var endpoint = sp.GetRequiredService<IConfiguration>()["AzureOpenAI:Endpoint"]
                ?? throw new InvalidOperationException(
                    "Missing Azure AI configuration. Set AzureOpenAI:Endpoint, AzureOpenAI:AiModels:TaskGeneration:DeploymentId, and AzureOpenAI:AiModels:Breakdown:DeploymentId in configuration.");
            return new AIProjectClient(new Uri(endpoint), new DefaultAzureCredential());
        });

        return services;
    }
}

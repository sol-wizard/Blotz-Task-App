using Azure.AI.Projects;
using Azure.Identity;
using BlotzTask.Shared.Options;

namespace BlotzTask.Extension;

public static class AgentFrameworkServiceExtensions
{
    public static IServiceCollection AddAgentFrameworkServices(this IServiceCollection services)
    {
        // AIProjectClient is shared — one client, two deployment targets.
        // AIAgent is NOT created here because instructions are user-specific
        // (language + local time) and must be set per-session in the service layer.
        services.AddSingleton(sp =>
        {
            var endpoint = sp.GetRequiredService<IConfiguration>()["AzureOpenAI:Endpoint"]
                ?? throw new InvalidOperationException(
                    "Missing Azure AI configuration. Set AzureOpenAI:Endpoint in configuration.");
            return new AIProjectClient(new Uri(endpoint), new DefaultAzureCredential());
        });

        services.AddOptions<AiModelOptions>()
            .BindConfiguration(AiModelOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        return services;
    }
}

using Azure;
using Azure.AI.OpenAI;
using Azure.AI.Projects;
using Azure.Identity;
using OpenAI;
using System.ClientModel;

namespace BlotzTask.Extension;

public static class AgentFrameworkServiceExtensions
{
    public class AzureAIOptions
    {
        public required string Endpoint { get; init; }
        public required string ApiKey { get; init; }
        public required string TaskGenerationDeploymentId { get; init; }
        public required string BreakdownDeploymentId { get; init; }
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
        };

        var groqApiKey = configuration["Groq:ApiKey"]
            ?? throw new InvalidOperationException("Missing Groq:ApiKey");
        var groqSpeechModel = configuration["Groq:SpeechModel"]
            ?? throw new InvalidOperationException("Missing Groq:SpeechModel");

        // AIProjectClient is shared — one client, multiple deployment targets.
        // AIAgent is NOT created here because instructions are user-specific
        // (language + local time) and must be set per-session in the service layer.
        //TODO: to see whether we have a better solution
        services.AddSingleton(options);
        services.AddSingleton<AzureOpenAIClient>(_ =>
            new AzureOpenAIClient(new Uri(options.Endpoint), new AzureKeyCredential(options.ApiKey)));
        services.AddSingleton<AIProjectClient>(_ =>
            new AIProjectClient(new Uri(options.Endpoint), new DefaultAzureCredential()));
        services.AddSingleton(_ =>
        {
            var groqClient = new OpenAIClient(
                new ApiKeyCredential(groqApiKey),
                new OpenAIClientOptions { Endpoint = new Uri("https://api.groq.com/openai/v1") });
            return groqClient.GetAudioClient(groqSpeechModel);
        });

        return services;
    }
}

using Azure;
using Azure.AI.OpenAI;
using Azure.AI.Projects;
using Azure.Identity;
using BlotzTask.Extension.Options;
using Microsoft.Extensions.Options;
using OpenAI;
using System.ClientModel;

namespace BlotzTask.Extension;

public static class AgentFrameworkServiceExtensions
{
    public static IServiceCollection AddAgentFrameworkServices(this IServiceCollection services)
    {
        services.AddOptions<AzureOpenAIOptions>()
            .BindConfiguration(AzureOpenAIOptions.SectionName)
            .ValidateDataAnnotations()
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.AiModels.TaskGeneration.DeploymentId),
                $"Missing {AzureOpenAIOptions.SectionName}:AiModels:TaskGeneration:DeploymentId")
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.AiModels.Breakdown.DeploymentId),
                $"Missing {AzureOpenAIOptions.SectionName}:AiModels:Breakdown:DeploymentId")
            .Validate(
                options => Uri.TryCreate(options.Endpoint, UriKind.Absolute, out _),
                $"{AzureOpenAIOptions.SectionName}:Endpoint must be a valid absolute URI");

        services.AddOptions<GroqOptions>()
            .BindConfiguration(GroqOptions.SectionName)
            .ValidateDataAnnotations()
            .Validate(
                options => Uri.TryCreate(options.Endpoint, UriKind.Absolute, out _),
                $"{GroqOptions.SectionName}:Endpoint must be a valid absolute URI")
            .ValidateOnStart();

        // AIProjectClient is shared — one client, multiple deployment targets.
        // AIAgent is NOT created here because instructions are user-specific
        // (language + local time) and must be set per-session in the service layer.
        //TODO: to see whether we have a better solution
        services.AddSingleton<AzureOpenAIClient>(serviceProvider =>
        {
            var options = serviceProvider.GetRequiredService<IOptions<AzureOpenAIOptions>>().Value;
            return new AzureOpenAIClient(new Uri(options.Endpoint), new AzureKeyCredential(options.ApiKey));
        });
        services.AddSingleton<AIProjectClient>(serviceProvider =>
        {
            var options = serviceProvider.GetRequiredService<IOptions<AzureOpenAIOptions>>().Value;
            return new AIProjectClient(new Uri(options.Endpoint), new DefaultAzureCredential());
        });
        services.AddSingleton(serviceProvider =>
        {
            var options = serviceProvider.GetRequiredService<IOptions<GroqOptions>>().Value;
            var groqClient = new OpenAIClient(
                new ApiKeyCredential(options.ApiKey),
                new OpenAIClientOptions { Endpoint = new Uri(options.Endpoint) });
            return groqClient.GetAudioClient(options.SpeechModel);
        });

        return services;
    }
}

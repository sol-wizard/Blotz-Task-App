using Microsoft.SemanticKernel;

namespace BlotzTask.Extension;

public static class SemanticKernelServiceExtensions
{
    public static IServiceCollection AddSemanticKernelServices(
        this IServiceCollection services, IConfiguration configuration)
    {
        var endpoint = configuration["AzureOpenAI:Endpoint"];
        var taskGenerationDeploymentId = configuration["AzureOpenAI:AiModels:TaskGeneration:DeploymentId"];
        var breakdownDeploymentId = configuration["AzureOpenAI:AiModels:Breakdown:DeploymentId"];
        var apiKey = configuration["AzureOpenAI:ApiKey"];

        if (string.IsNullOrWhiteSpace(endpoint) ||
            string.IsNullOrWhiteSpace(taskGenerationDeploymentId) ||
            string.IsNullOrWhiteSpace(breakdownDeploymentId) ||
            string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException(
                "Missing Azure OpenAI configuration. Set AzureOpenAI:Endpoint, AzureOpenAI:DeploymentId, and AzureOpenAI:ApiKey in configuration or via Key Vault reference.");
        }

        services.AddKernel()
            .AddAzureOpenAIChatCompletion(taskGenerationDeploymentId, endpoint, apiKey)
            .AddAzureOpenAIChatCompletion(breakdownDeploymentId, endpoint, apiKey);

        return services;
    }
}
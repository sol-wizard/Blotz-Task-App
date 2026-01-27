using Azure.Security.KeyVault.Secrets;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Extension;

public static class SemanticKernelServiceExtensions
{
    public static IServiceCollection AddSemanticKernelServices(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        // Register the Kernel as a singleton service
        services.AddSingleton<Kernel>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<Program>>();
            var secretClient = sp.GetService<SecretClient>();
            var endpoint = configuration["AzureOpenAI:Endpoint"];
            var deploymentId = configuration["AzureOpenAI:DeploymentId"];
            var apiKey = configuration["AzureOpenAI:ApiKey"];

            if (secretClient != null && environment.IsProduction())
            {
                try
                {
                    apiKey = secretClient.GetSecret("azureopenai-apikey").Value.Value;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to retrieve API key from Azure Key Vault");
                }
            }

            if (string.IsNullOrWhiteSpace(endpoint) ||
                string.IsNullOrWhiteSpace(deploymentId) ||
                string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException(
                    "Missing Azure OpenAI configuration. Please set AzureOpenAI:Endpoint, AzureOpenAI:DeploymentId, and AzureOpenAI:ApiKey (or ensure Key Vault contains 'azureopenai-apikey' in production).");
            }

            var kernelBuilder = Kernel.CreateBuilder();

            kernelBuilder.AddAzureOpenAIChatCompletion(
                deploymentId,
                endpoint,
                apiKey
            );

            return kernelBuilder.Build();
        });

        services.AddScoped<IChatCompletionService>(sp =>
        {
            var kernel = sp.GetRequiredService<Kernel>();
            return kernel.GetRequiredService<IChatCompletionService>();
        });

        return services;
    }
}




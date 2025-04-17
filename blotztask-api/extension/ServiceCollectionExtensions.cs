namespace BlotzTask.extension;

using Azure;
using Azure.AI.OpenAI;
using Azure.Security.KeyVault.Secrets;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddAzureOpenAI(this IServiceCollection services, IConfiguration configuration, SecretClient? secretClient = null)
    {
        var endpoint = configuration["AzureOpenAI:Endpoint"];
        var deploymentId = configuration["AzureOpenAI:DeploymentId"];
        string? apiKey;

        if (secretClient != null) // If in production get from keyvault
        {
            var apiKeySecret = secretClient.GetSecret("azureopenai-apikey");
            apiKey = apiKeySecret.Value.Value;
        }
        else // If in Development, get key from appsettings.json
        {
            apiKey = configuration["AzureOpenAI:ApiKey"];
        }

        
        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey))
        {
            throw new ArgumentException("Endpoint or API Key is missing! Please check appsettings.json.");
        }
        
        var azureClient = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));

        var chatClient = azureClient.GetChatClient(deploymentId);

        services.AddSingleton(chatClient);

        return services;
    }

}

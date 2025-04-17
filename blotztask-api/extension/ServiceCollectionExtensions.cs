namespace BlotzTask.extension;

using Azure;
using Azure.AI.OpenAI;
using Azure.Security.KeyVault.Secrets;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddAzureOpenAI(this IServiceCollection services, IConfiguration configuration, SecretClient? secretClient = null)
    {
        
        var endpoint = configuration["AzureOpenAI:Endpoint"];

       
        string? apiKey;
        if (secretClient == null)
        {
            throw new ArgumentNullException(nameof(secretClient), "SecretClient is null. Please provide a valid SecretClient.");
        }
        apiKey = configuration["AzureOpenAI:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new ArgumentException("apiKey is missing! Please check appsettings.json.");
        }

        if (string.IsNullOrWhiteSpace(endpoint))
        {
            throw new ArgumentException("Endpoint is missing! Please check appsettings.json.");
        }
        var deploymentId = configuration["AzureOpenAI:DeploymentId"];


 

        if (secretClient != null) // If in production get from keyvault
        {
            var apiKeySecret = secretClient.GetSecret("azureopenai-apikey");
            apiKey = apiKeySecret.Value.Value;
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new ArgumentException("API Key is missing! Please check appsettings.json.");
            }
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

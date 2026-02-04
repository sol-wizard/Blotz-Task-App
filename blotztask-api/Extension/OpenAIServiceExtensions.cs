namespace BlotzTask.Extension;

using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;

public static class OpenAiServiceExtensions
{
    public static IServiceCollection AddAzureOpenAi(this IServiceCollection services)
    {
        services.AddSingleton<ChatClient>(sp =>
        {
            var config = sp.GetRequiredService<IConfiguration>();

            var endpoint = config["AzureOpenAI:Endpoint"];
            var deploymentId = config["AzureOpenAI:DeploymentId"];
            var apiKey = config["AzureOpenAI:ApiKey"];

            if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException(
                    "Missing Azure OpenAI configuration. Set AzureOpenAI:Endpoint and AzureOpenAI:ApiKey in configuration or via Key Vault reference.");
            }

            var client = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
            return client.GetChatClient(deploymentId);
        });

        return services;
    }
}

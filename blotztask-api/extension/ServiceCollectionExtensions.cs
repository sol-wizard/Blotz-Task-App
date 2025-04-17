namespace BlotzTask.extension;

using Azure;
using Azure.AI.OpenAI;
using Azure.Security.KeyVault.Secrets;
using OpenAI.Chat;

public static class ServiceCollectionExtensions
{
        public static IServiceCollection AddAzureOpenAI(this IServiceCollection services)
        {
            services.AddSingleton<ChatClient>(sp =>
            {
                var config = sp.GetRequiredService<IConfiguration>();
                var secretClient = sp.GetService<SecretClient>(); 

                var endpoint = config["AzureOpenAI:Endpoint"];
                var deploymentId = config["AzureOpenAI:DeploymentId"];
                string? apiKey;

                if (secretClient != null)
                {
                    apiKey = secretClient.GetSecret("azureopenai-apikey").Value.Value;
                }
                else
                {
                    apiKey = config["AzureOpenAI:ApiKey"];
                }

                if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey))
                {
                    throw new ArgumentException("Endpoint or API Key is missing!");
                }

                var client = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
                return client.GetChatClient(deploymentId);
            });

            return services;
        }

}

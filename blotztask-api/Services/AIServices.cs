using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;

public class AzureOpenAIService
{
    private readonly ChatClient _chatClient;
    private readonly string _deploymentId;
    private readonly ILogger<AzureOpenAIService> _logger;
    
    public AzureOpenAIService(IConfiguration configuration, ILogger<AzureOpenAIService> logger)
    {
        _logger = logger;

        var endpoint = configuration["AzureOpenAI:Endpoint"];
        _deploymentId = configuration["AzureOpenAI:DeploymentId"];
        var apiKey = configuration["AzureOpenAI:ApiKey"];

        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey))
        {
            throw new ArgumentException("Endpoint or API Key is missing! Please check appsettings.json.");
        }

        _logger.LogInformation($"Using Deployment ID: {_deploymentId}");
        _logger.LogInformation($"Using Endpoint: {endpoint}");

        var azureClient = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));

        _chatClient = azureClient.GetChatClient(_deploymentId);
    }

    public async Task<string> GenerateResponseAsync(string prompt)
    {
        var messages = new List<ChatMessage>
        {
            new SystemChatMessage("You are a helpful AI assistant."),
            new UserChatMessage(prompt)
        };

        var completion = await _chatClient.CompleteChatAsync(messages);

        // 🛑 Breakpoint here to inspect `completion?.Value`
        var responseContent = completion.Value.Content.Last().Text;

        return responseContent ?? "No response received.";  // ✅ Extract text properly
    }
}
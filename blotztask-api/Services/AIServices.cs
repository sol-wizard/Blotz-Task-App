using System.Text.Json;
using Azure;
using Azure.AI.OpenAI;
using Azure.Security.KeyVault.Secrets;
using BlotzTask.Models;
using OpenAI.Chat;

public class AzureOpenAIService
{
    private readonly ChatClient _chatClient;
    private readonly string _deploymentId;
    
    public AzureOpenAIService(
        IConfiguration configuration, 
        SecretClient? secretClient = null)
    {
        var endpoint = configuration["AzureOpenAI:Endpoint"];
        _deploymentId = configuration["AzureOpenAI:DeploymentId"];
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

        _chatClient = azureClient.GetChatClient(_deploymentId);
    }

    public async Task<ExtractedTask?> GenerateResponseAsync(string prompt)
    {
        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(@"
            You are a task extraction assistant. You must always call the `extract_task` function with structured data. Do not return plain text. 

            If a due date is not provided, explicitly set `due_date` to `null`.

            You must call `extract_task` like this:
            {
              'title': '<Extracted Task Title>',
              'due_date': '<YYYY-MM-DD>' or null
            }
            "),
            new UserChatMessage(prompt)
        };

        var extractTaskTool = ChatTool.CreateFunctionTool(
            functionName: "extract_task",
            functionDescription: "Extracts task details from the provided input.",
            functionParameters: BinaryData.FromObjectAsJson(new
            {
                type = "object",
                properties = new
                {
                    title = new { type = "string", description = "Title of the task extracted from the user's input." },
                    due_date = new { type = "string", format = "date", description = "Due date of the task in YYYY-MM-DD format." }
                },
                required = new[] { "title" }
            })
        );

        ChatCompletionOptions options = new()
        {
            Tools = { extractTaskTool }
        };

        try
        {
            ChatCompletion completion = await _chatClient.CompleteChatAsync(messages, options);

            // ✅ Log the full response to check what Azure OpenAI is returning
            Console.WriteLine("Full AI Response:");
            Console.WriteLine(JsonSerializer.Serialize(completion, new JsonSerializerOptions { WriteIndented = true }));

            if (completion.ToolCalls.Count > 0)
            {
                var toolCall = completion.ToolCalls.FirstOrDefault(tc => tc.FunctionName == "extract_task");

                if (toolCall != null)
                {
                    Console.WriteLine("Function Called: " + toolCall.FunctionName);
                    Console.WriteLine("Raw Arguments: " + toolCall.FunctionArguments.ToString());

                    // ✅ Deserialize correctly
                    var extractedTask = toolCall.FunctionArguments.ToObjectFromJson<ExtractedTask>();

                    if (extractedTask != null)
                    {
                        Console.WriteLine($"Extracted Task: Title={extractedTask.Title}, DueDate={extractedTask.DueDate}");
                        return extractedTask;
                    }
                }
            }

            Console.WriteLine("No valid function arguments received.");
            return null;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred: {ex.Message}");
            return null;
        }
    }
}
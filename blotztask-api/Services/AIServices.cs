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
            You are a task extraction assistant. Always call the `extract_task` function with structured data. Never return plain text.

            Extract:
            - `title`: A clear task title.
            - `description`: A clear task description.
            - `due_date`: A YYYY-MM-DD date, or null if not found.
            - `message`: A helpful message to the user.
            - `isValidTask`: Set to true if the input clearly describes a task. Set to false if the input is vague or unclear.

            Guidelines:
            - It's perfectly fine if a due date is missing. Just set `due_date` to null and include a message that you think is makesense

            - When generating the description, summarize the user's input concisely without adding new information. Do not make assumptions or fabricate details. If the input lacks enough detail for a clear description, copy the input or leave the description brief.

            - Only set `isValidTask` to false if the input is clearly not a task or lacks any actionable meaning.
            
            - Keep the message consistent with `isValidTask`: if false, the message should ask the user to rephrase. If true, the message should confirm or guide.

            Always return all 4 fields: `title`, `due_date`, `message`, and `isValidTask`.

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
                    description = new { type = "string", description = "Description of the task extracted from or generated based on user's input."},
                    due_date = new { type = "string", format = "date", description = "Due date of the task in YYYY-MM-DD format." },
                    message = new { type = "string", description = "Optional message from the AI to the user. Leave null if not needed." },
                    isValidTask = new
                    {
                        type = "boolean",
                        description = "True if the input was understood as a task, false if it was unclear or vague."
                    }
                },
                required = new[] { "title", "description", "due_date", "message", "isValidTask" }
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
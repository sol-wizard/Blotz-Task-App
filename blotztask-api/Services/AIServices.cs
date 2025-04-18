using System.Text.Json;
using BlotzTask.Models;
using BlotzTask.Services;
using OpenAI.Chat;

public class TaskGenerationAIService
{
    private readonly ChatClient _chatClient;
    private readonly ILabelService _labelService;
    
    public TaskGenerationAIService(
        ILabelService labelService,
        ChatClient chatClient)
    {
        _chatClient = chatClient;
        _labelService = labelService;
    }

    public async Task<List<ExtractedTaskDTO>> GenerateResponseAsync(string prompt)
    {
        List<LabelDTO> labels = await _labelService.GetAllLabelsAsync();
        var labelNames = labels.Select(label => label.Name).ToHashSet();

        var messages = new List<ChatMessage>
        {
            new UserChatMessage(prompt)
        };
        
        messages.Insert(0, new SystemChatMessage($@"
            You are a task extraction assistant. Today's date is {DateTime.UtcNow:yyyy-MM-dd}. 
            Please extract **all** tasks from the user input below and return a single JSON object with a `tasks` array.
            Always call the `extract_tasks` function with structured data. Never return plain text.

            Extract:
            - `title`: A clear task title.
            - `description`: A clear task description.
            - `due_date`: A YYYY-MM-DD date, or null if not found.
            - `message`: A helpful message to the user.
            - `label`: A category label for the task.
            - `isValidTask`: Set to true if the input clearly describes a task. Set to false if the input is vague or unclear.

            In the structure of: 
            {{
                ""tasks"": [
                {{
                ""title"": string,
                ""description"": string,
                ""due_date"": string (YYYY-MM-DD or null),
                ""label"": string,
                ""isValidTask"": boolean,
                ""message"": string
                }}
                // ... additional tasks if present
            ]
            }}

            Guidelines:
            - It's perfectly fine if a due date is missing. Just set `due_date` to null and include a message that you think is makesense

            - When generating the description, summarize the user's input concisely without adding new information. Do not make assumptions or fabricate details. If the input lacks enough detail for a clear description, copy the input or leave the description brief.

            - Only set `isValidTask` to false if the input is clearly not a task or lacks any actionable meaning.
            
            - Keep the message consistent with `isValidTask`: if false, the message should ask the user to rephrase. If true, the message should confirm or guide.

            Each task object must include exactly these six fields. Even if only one task is found, it should still be inside the `tasks` array.

            ")
        );

        var extractTasksTool = ChatTool.CreateFunctionTool(
            functionName: "extract_tasks",
            functionDescription: "Extracts tasks details from the provided input and return a task array. ",
            functionParameters: BinaryData.FromObjectAsJson(new
            {
                type = "object",
                    properties = new
                    {
                        tasks = new
                        {
                            type = "array",
                            items = new
                            {
                                type = "object",
                                properties = new
                                {
                                    properties = new
                                    {
                                        title = new { type = "string", description = "Title of the task extracted from the user's input." },
                                        description = new { type = "string", description = "Description of the task extracted from or generated based on user's input."},
                                        due_date = new { type = "string", format = "date", description = "Due date of the task in YYYY-MM-DD format." },
                                        message = new { type = "string", description = "Optional message from the AI to the user. Leave null if not needed." },
                                        label = new { type = "string", description = $@"Category label for the task, which must correspond to one of the {string.Join(", ", labelNames)}." },
                                        isValidTask = new
                                        {
                                            type = "boolean",
                                            description = "True if the input was understood as a task, false if it was unclear or vague."
                                        }
                                    },
                                },
                                required = new[] { "title", "description", "due_date", "label", "isValidTask", "message" }
                            }
                        }
                    },
                    required = new[] { "tasks" }
            })
        );

        var options = new ChatCompletionOptions
        {
            Tools = { extractTasksTool }
        };

        try
        {
            ChatCompletion completion = await _chatClient.CompleteChatAsync(messages, options);

            // ✅ Log the full response to check what Azure OpenAI is returning
            Console.WriteLine("Full AI Response:");
            Console.WriteLine(JsonSerializer.Serialize(completion, new JsonSerializerOptions { WriteIndented = true }));

            if (completion.ToolCalls.Count > 0)
            {
                var toolCall = completion.ToolCalls.FirstOrDefault(tc => tc.FunctionName == "extract_tasks");

                if (toolCall != null)
                {
                    Console.WriteLine("Function Called: " + toolCall.FunctionName);
                    Console.WriteLine("Raw Arguments: " + toolCall.FunctionArguments.ToString());

                    var wrapper = toolCall.FunctionArguments
                        .ToObjectFromJson<ExtractedTasksWrapper>()
                        ?? throw new InvalidOperationException("Failed to parse tasks array.");

                    var results = wrapper.Tasks
                        .Select(t => handleExtractedTask(t, labels, labelNames))
                        .ToList();

                    return results;
                }
            }

            Console.WriteLine("No valid function arguments received.");
            return new List<ExtractedTaskDTO>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred: {ex.Message}");
            return new List<ExtractedTaskDTO>();
        }
    }

    private ExtractedTaskDTO handleExtractedTask(ExtractedTask? extractedTask, List<LabelDTO> labels, HashSet<string> labelNames)
    {
        if (extractedTask is null)
            throw new ArgumentNullException(nameof(extractedTask));

        if (!labelNames.Contains(extractedTask.label))
        {
            extractedTask.label = "Others";
        }

        return new ExtractedTaskDTO
        {
            Title = extractedTask.Title,
            Description = extractedTask.Description,
            DueDate = extractedTask.DueDate,
            Message = extractedTask.Message,
            IsValidTask = extractedTask.IsValidTask,
            Label = labels.First(x => x.Name == extractedTask.label)
        };
    }
}
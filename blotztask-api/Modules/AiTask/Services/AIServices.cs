using BlotzTask.Modules.AiTask.DTOs;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Shared.DTOs;
using OpenAI.Chat;

namespace BlotzTask.Modules.AiTask.Services;

//TODO: Extract this to an service with interface like other services
public class TaskGenerationAiService
{
    private readonly ChatClient _chatClient;
    
    public TaskGenerationAiService(
        ChatClient chatClient)
    {
        _chatClient = chatClient;
    }

    public async Task<ExtractedTasksWrapper> GenerateResponseAsync(string prompt, string timezoneId, CancellationToken ct)
    {
        // var (labels, labelNames) = await GetLabelInfoAsync();

        var messages = new List<ChatMessage>
        {
            new UserChatMessage(prompt)
        };

        var localNow = GetLocalDate(timezoneId);
        //TODO: Check if we need to redo how we define invalid task, test this by random input in the AI assistant
        messages.Insert(0, new SystemChatMessage($@"
            You are a task extraction assistant. Today's date is {localNow:yyyy-MM-dd}. 
            Please extract **all** tasks from the user input below and return a single JSON object with a `tasks` array.
            Always call the `extract_tasks` function with structured data. Never return plain text.

            Extract in the structure of: 
            {{
                ""tasks"": [
                    {{
                    ""title"": string,
                    ""description"": string,
                    ""due_date"": string (YYYY-MM-DD or null),
                    ""label"": string, A category label for the task,
                    ""isValidTask"": boolean, Set to true if the input clearly describes a task. Set to false if the input is vague or unclear
                    }}
                    // ... additional tasks if present
                ],
                ""message"": string, A helpful overall message to the user
            }}

            Guidelines:
            - It's perfectly fine if a due date is missing. Just set `due_date` to null and include a message that you think is makesense

            - When generating the description, summarize the user's input concisely without adding new information. Do not make assumptions or fabricate details. If the input lacks enough detail for a clear description, copy the input or leave the description brief.

            - Only set `isValidTask` to false if the input is clearly not a task or lacks any actionable meaning.
            
            - Keep the message consistent with `isValidTask`: if false, the message should ask the user to rephrase. If true, the message should confirm or guide.
            
            - You should split user input into multiple tasks if they describe more than one action, even if they are in a single sentence.

            - Tasks can be separated by **and**, **then**, punctuation, or implied actions.
            
            - Each task object must include exactly these six fields. Even if only one task is found, it should still be inside the `tasks` array.

            - Return a single JSON object with two fields: `tasks` and `message`.

            ")
        );

        // tool schema -- what structure AI must follow
        // var tool = CreateExtractedTasksTool(labelNames);
        
        // var resultWrapper = await CallToolAndDeserializeAsync<ExtractedTasksWrapperRaw>(
        //     toolFunctionName: "extract_tasks",
        //     messages: messages,
        //     tool: tool,
        //     cancellationToken: ct
        //     );

        return null;
    }


    // private async Task<(List<LabelDto> labels, HashSet<string> labelNames)> GetLabelInfoAsync()
    // {
    //     var labels = await _labelService.GetAllLabelsAsync();
    //     var labelNames = labels.Select(label => label.Name).ToHashSet();
    //     return (labels, labelNames);
    // }

    // give AI a standard structure to follow
    private ChatTool CreateExtractedTasksTool(HashSet<string> labelNames)
    {
        return ChatTool.CreateFunctionTool(
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
                                    title = new { type = "string", description = "Title of the task extracted from the user's input." },
                                    description = new { type = "string", description = "Description of the task extracted from or generated based on user's input."},
                                    due_date = new { type = "string", format = "date", description = "Due date of the task in YYYY-MM-DD format." },
                                    label = new { type = "string", description = $@"Category label for the task, which must correspond to one of the {string.Join(", ", labelNames)}." },
                                    isValidTask = new
                                    {
                                        type = "boolean",
                                        description = "True if the input was understood as a task, false if it was unclear or vague."
                                    },
                                },
                                required = new[] { "title", "description", "due_date", "label", "isValidTask" }
                            }
                        },
                        message = new
                        {
                            type = "string",
                            description = "Overall message to the user summarizing the result of task extraction."
                        }
                    },
                required = new[] { "tasks", "message" }
            })
        );
    }

    private async Task<T?> CallToolAndDeserializeAsync<T>(
        string toolFunctionName,
        List<ChatMessage> messages,
        ChatTool tool,
        CancellationToken cancellationToken,
        // pass-in fallbackDeserializer function as backup when json converter fails
        Func<string, T?>? fallbackDeserializer = null) where T : class
    {
        // tools (output structures) to choose from
        ChatCompletionOptions options = new()
        {
            Tools = { tool }
        };

        try
        {
            ChatCompletion completion = await _chatClient.CompleteChatAsync(messages, options, cancellationToken);

            // no tool is called
            if (completion.ToolCalls.Count == 0)
            {
                Console.WriteLine($"[AI Warning] No tool call triggered for '{toolFunctionName}'.");
                return null;
            }

            // Find the specific tool name called by AI
            var toolCall = completion.ToolCalls.FirstOrDefault(tc => tc.FunctionName == toolFunctionName);

            if (toolCall == null)
            {
                Console.WriteLine($"[AI Warning] Tool function '{toolFunctionName}' not found.");
                return null;
            }

            // deserialize the tool function arguments into the target type T
            var result = toolCall.FunctionArguments.ToObjectFromJson<T>();

            // If deserialization fails and a fallback deserializer is provided, attempt fallback
            if (result == null && fallbackDeserializer != null)
            {
                Console.WriteLine("[AI Debug] Attempting fallback deserializer...");
                result = fallbackDeserializer(toolCall.FunctionArguments.ToString());
            }

            if (result == null)
            {
                Console.WriteLine("[AI Error] Deserialization returned null.");
            }

            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AI Error] Exception in tool call: {ex.Message}");
            return null;

        }
    }

    private ExtractedTaskGoalPlanner HandleExtractedTask(ExtractedTaskGoalPlannerRaw? extractedTask, List<LabelDto> labels, HashSet<string> labelNames)
    {
        if (extractedTask is null)
            throw new ArgumentNullException(nameof(extractedTask));

        if (!labelNames.Contains(extractedTask.Label))
        {
            extractedTask.Label = "Others";
        }

        return new ExtractedTaskGoalPlanner
        {
            Title = extractedTask.Title,
            Description = extractedTask.Description,
            EndTime = extractedTask.EndTime,
            IsValidTask = extractedTask.IsValidTask,
            Label = labels.First(x => x.Name == extractedTask.Label)
        };
    }

    private ExtractedTasksWrapper ConvertToWrapperDto(
        ExtractedTasksWrapperRaw? wrapper,
        List<LabelDto> labels,
        HashSet<string> labelNames,
        string fallbackMessage = "AI failed to generate tasks.")
    {
        if (wrapper == null)
        {
            return new ExtractedTasksWrapper
            {
                Message = fallbackMessage,
                Tasks = new()
            };
        }

        // check if ai generated label is legal and convert them in DTO
        var results = wrapper.Tasks
            .Select(t => HandleExtractedTask(t, labels, labelNames))
            .ToList();

        return new ExtractedTasksWrapper
        {
            Message = wrapper.Message,
            Tasks = results
        };
    }

    private DateTime GetLocalDate(string timezoneId)
    {
        var timezone = TimeZoneInfo.FindSystemTimeZoneById(timezoneId);
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timezone);
    }

}
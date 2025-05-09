using System.Text.Json;
using BlotzTask.Models;
using BlotzTask.Services;
using OpenAI.Chat;
using BlotzTask.Models.GoalToTask;


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

    public async Task<ExtractedTasksWrapperDTO> GenerateResponseAsync(string prompt, string timezoneId)
    {
        var (labels, labelNames) = await GetLabelInfoAsync();

        var messages = new List<ChatMessage>
        {
            new UserChatMessage(prompt)
        };

        var localNow = GetLocalDate(timezoneId);
        
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
        var tool = CreateExtractedTasksTool(labelNames);

        // 
        var resultWrapper = await CallToolAndDeserializeAsync<ExtractedTasksWrapper>(
            toolFunctionName: "extract_tasks",
            messages: messages,
            tool: tool);

        return ConvertToWrapperDTO(resultWrapper, labels, labelNames);

    }

    private async Task<string> GenerateConfidenceScoreAsync(GoalToTasksRequest request)
    {
        var (labels, labelNames) = await GetLabelInfoAsync();

        var localNow = GetLocalDate(request.TimeZoneId);
        var messages = new List<ChatMessage>
        {
            new SystemChatMessage($@"
        You are a goal evaluation assistant. Today's date is {localNow:yyyy-MM-dd}.

        Your job is to assess how clear and specific the user's goal is. 
        Output a **confidence score** between 0 and 1:

        - 1 means the goal is **clear, specific, and provides sufficient context** for task planning.
        - Below 0.7 means the goal is vague, overly general, complex, or niche, and more information is needed.
        - 0 means the goal is impossible to understand.

        **Do NOT generate any tasks or suggestions. Only return the confidence score.**

        Your response format must be:
        {{
            ""confidenceScore"": (number between 0 and 1)
        }}
        "),
            new UserChatMessage($"""
        My goal is: {request.Goal}
        I want to complete it in {request.DurationInDays} days.
        Please help me evaluate the clarity of my goal.
        """)
        };


        var tool = CreateConfidenceScoreTool();
        var wrapper = await CallToolAndDeserializeAsync<ConfidenceScoreWrapper>(
            toolFunctionName: "assess_goal_confidence",
            messages: messages,
            tool: tool);


        return wrapper.ConfidenceScore.ToString("F2"); 

    }

    public async Task<ExtractedTasksWrapperDTO> GenerateTasksFromGoalAsync(GoalToTasksRequest request)
    {
        var confidenceScoreString = await GenerateConfidenceScoreAsync(request);
        double confidenceScore = double.Parse(confidenceScoreString);  

        var (labels, labelNames) = await GetLabelInfoAsync();
        var messages = new List<ChatMessage>();
        if (confidenceScore < 0.7)
        {
            messages = new List<ChatMessage>
            {
                new SystemChatMessage($@"
                You are a goal planning assistant. The user's goal was evaluated as unclear or lacking sufficient detail.

                Your job:
                - Politely ask the user to provide additional information **based on what is missing** from their original goal.
                - Suggest what kind of details would help you create a better task plan. (For example: specific outcomes, context, time constraints, or any special considerations.)
                - **Only respond by calling the `create_goal_to_tasks` function. Do not reply in natural language.**
                
                You should return an empty task and it contains::
                - `title`: '' (an empty string).
                - `description`: '' (an empty string).
                - `due_date`: {DateTime.UtcNow:yyyy-MM-dd}
                - `label`: One of the following categories: {string.Join(", ", labelNames)}.
                - `isValidTask`: false.
                Your response format must be:
                {{
                    ""tasks"": [<an empty task objects>],
                    ""message"": ""(your request for clarification)""
                    ""confidenceScore"": {confidenceScore}
                }}
            "),
                new UserChatMessage($"""
                My goal is: {request.Goal}
                I want to complete it in {request.DurationInDays} days.
                Please help me create a better task plan.
                """)
            };
            
        }
        else {
            
            messages = new List<ChatMessage>
            {
                new SystemChatMessage($@"
                You are a task planning assistant. Today's date is {DateTime.UtcNow:yyyy-MM-dd}.
                Your job is to break down a user's goal into multiple **meaningful and necessary** tasks using the `create_goal_to_tasks` function.
                Each task must contain:
                - `title`: A clear and focused title.
                - `description`: A concise explanation of what to do.
                - `due_date`: Estimated completion date in YYYY-MM-DD format, based on logical task flow and available time.
                - `label`: One of the following categories: {string.Join(", ", labelNames)}.
                - `isValidTask`: Set to true if this is a concrete and actionable task.

                The final output should be an object like:
                {{
                ""tasks"": [ <list of task objects> ],
                ""message"": ""A helpful message summarizing the task plan.""
                ""confidenceScore"": {confidenceScore}
                }}

                Guidelines:
                - The number of tasks should depend on the goal's complexity, not on the number of available days.
                - Use the provided duration only as a **soft time frame** to estimate due dates, not as a target for task count.
                - You can use fewer tasks if the goal is simple, or more if it's complex.
                "),
                new UserChatMessage($"""
                My goal is: {request.Goal}
                I want to complete it in {request.DurationInDays} days.
                Please help me plan actionable tasks.
                """)
            };
        }
       

        var tool = CreateGoalToTaskTool(labelNames);
        var wrapper = await CallToolAndDeserializeAsync<GoalTasksWrapper>(
            toolFunctionName: "create_goal_to_tasks",
            messages: messages,
            tool: tool);
        


        return ConvertToGoalWrapperDTO(wrapper, labels, labelNames);

    }

    private async Task<(List<LabelDTO> labels, HashSet<string> labelNames)> GetLabelInfoAsync()
    {
        var labels = await _labelService.GetAllLabelsAsync();
        var labelNames = labels.Select(label => label.Name).ToHashSet();
        return (labels, labelNames);
    }

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

    private ChatTool CreateConfidenceScoreTool()
{
    return ChatTool.CreateFunctionTool(
        functionName: "assess_goal_confidence",
        functionDescription: "Evaluates the clarity of a user's goal and returns a confidence score between 0 and 1.",
        functionParameters: BinaryData.FromObjectAsJson(new
        {
            type = "object",
            properties = new
            {
                confidenceScore = new { type = "number" }
            },
            required = new[] { "confidenceScore" }
        })
    );
}

    private ChatTool CreateGoalToTaskTool(HashSet<string> labelNames)
{
    return ChatTool.CreateFunctionTool(
        functionName: "create_goal_to_tasks",
        functionDescription: "Breaks down a goal into tasks.",
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
                            title = new { type = "string" },
                            description = new { type = "string" },
                            due_date = new { type = "string", format = "date" },
                            label = new { type = "string" },
                            isValidTask = new { type = "boolean" }
                        },
                        required = new[] { "title", "description", "due_date", "label", "isValidTask" }
                    }
                },
                message = new { type = "string" }, 
                confidenceScore = new { type = "number" }              
            },
            required = new[] { "tasks", "message", "confidenceScore" }
        })
    );
}


    private async Task<T?> CallToolAndDeserializeAsync<T>(
        string toolFunctionName,
        List<ChatMessage> messages,
        ChatTool tool,
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
            ChatCompletion completion = await _chatClient.CompleteChatAsync(messages, options);

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

    private ExtractedTaskDTO HandleExtractedTask(ExtractedTask? extractedTask, List<LabelDTO> labels, HashSet<string> labelNames)
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
            IsValidTask = extractedTask.IsValidTask,
            Label = labels.First(x => x.Name == extractedTask.label)
        };
    }

    private ExtractedTasksWrapperDTO ConvertToWrapperDTO(
        ExtractedTasksWrapper? wrapper,
        List<LabelDTO> labels,
        HashSet<string> labelNames,
        string fallbackMessage = "AI failed to generate tasks.")
    {
        if (wrapper == null)
        {
            return new ExtractedTasksWrapperDTO
            {
                Message = fallbackMessage,
                Tasks = new()
            };
        }

        // check if ai generated label is legal and convert them in DTO
        var results = wrapper.Tasks
            .Select(t => HandleExtractedTask(t, labels, labelNames))
            .ToList();

        return new ExtractedTasksWrapperDTO
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



    private ExtractedTasksWrapperDTO ConvertToGoalWrapperDTO(
    GoalTasksWrapper? wrapper,
    List<LabelDTO> labels,
    HashSet<string> labelNames,
    string fallbackMessage = "AI failed to generate tasks.")
{
    if (wrapper == null)
    {
        return new ExtractedTasksWrapperDTO
        {
            Message = fallbackMessage,
            Tasks = new List<ExtractedTaskDTO>(),
        };
    }

    var results = wrapper.Tasks
        .Select(t => HandleExtractedTask(t, labels, labelNames))
        .ToList();
    if (wrapper.ConfidenceScore < 0.7)
    {
        return new ExtractedTasksWrapperDTO
        {
            Tasks = new List<ExtractedTaskDTO>(),
            Message = wrapper.Message??"I need more details to create an acdocurate plan. Please provide more context or upload relevant materials.",
        };
    }
    return new ExtractedTasksWrapperDTO
    {
        Tasks = results,
        Message = wrapper.Message,
    };
}



}
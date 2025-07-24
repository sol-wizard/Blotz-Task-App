using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BlotzTask.Modules.AiTask.DTOs;
using BlotzTask.Modules.Labels.Services;
using BlotzTask.Modules.Tasks.DTOs;
using OpenAI.Chat;

namespace BlotzTask.Modules.AiTask.Services;

public class BreakdownService
{
    private readonly ILabelService _labelService;
    private readonly ChatClient _chatClient;
    private readonly ILogger<BreakdownService> _logger;

    public BreakdownService(ChatClient chatClient, ILabelService labelService, ILogger<BreakdownService> logger)
    {
        _chatClient = chatClient;
        _labelService = labelService;
        _logger = logger;
    }

    public async Task<BreakdownResponseDto> BreakdownTodoAsync(string title, string? description, CancellationToken ct)
    {
        _logger.LogInformation("Starting task breakdown for: {Title}", title);
        // Get Label
        var (labels, labelNames) = await AiLabelHelper.GetLabelInfoAsync(_labelService);
        var labelPrompt = AiLabelHelper.GetLabelPromptString(labelNames);

        // Pass Label to System Prompt
        var systemPrompt = @$"
        You are an assistant that helps users break down large tasks into smaller, manageable subtasks.

        Your goal is to reduce cognitive overload for neurodiverse users by:
        - Identifying when a task can be broken down
        - Returning subtasks only if decomposition is clearly beneficial
        - Keeping subtasks concise, actionable, and easy to follow

        Rules:
        - If the task is simple (e.g., one action or very short), reply:
        {{ ""action"": ""no_split"" }}

        - If the task contains multiple steps, reply:
        {{
            ""action"": ""split"",
            ""subtasks"": [
            {{
                ""title"": string,               // Subtask title (short and clear)
                ""description"": string,         // Optional detail, can match original description
                ""label"": string                // Must be one of: {labelPrompt}
            }}
            ]
        }}

        Examples:

        1. Simple task:
        Title: Buy groceries
        Description: Buy milk and eggs
        → Response: {{ ""action"": ""no_split"" }}

        2. Complex task:
        Title: Plan a birthday party
        Description: Book venue, send invites, order cake, arrange decorations
        → Response:
        {{
        ""action"": ""split"",
        ""subtasks"": [
            {{ ""title"": ""Book a venue"", ""description"": ""Reserve a place for the party."", ""label"": ""Event Planning"" }},
            {{ ""title"": ""Send invitations"", ""description"": ""Notify friends and family."", ""label"": ""Communication"" }},
            {{ ""title"": ""Order a cake"", ""description"": ""Get a unicorn-themed cake."", ""label"": ""Shopping"" }},
            {{ ""title"": ""Arrange decorations"", ""description"": ""Buy and set up decorations."", ""label"": ""Event Planning"" }}
        ]
        }}

        Now assess the following task:

        Title: {title}
        Description: {description ?? "None"}
        ";

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(systemPrompt)
        };

        var tool = ChatTool.CreateFunctionTool(
            functionName: "breakdown_task",
            functionDescription: "Break down a large task into subtasks if needed.",
            functionParameters: BinaryData.FromObjectAsJson(new
            {
                type = "object",
                properties = new
                {
                    action = new
                    {
                        type = "string",
                        description = "Either 'no_split' or 'split'."
                    },
                    subtasks = new
                    {
                        type = "array",
                        items = new
                        {
                            type = "object",
                            properties = new
                            {
                                title = new { type = "string", description = "Subtask title" },
                                description = new { type = "string", description = "Subtask description" },
                                label = new { type = "string", description = $"Label name, must be one of: {labelPrompt}" }
                            },
                            required = new[] { "title", "description", "label" }
                        }
                    }
                },
                required = new[] { "action", "subtasks" }
            })
        );

        var options = new ChatCompletionOptions
        {
            Tools = { tool }
        };

        _logger.LogInformation("Calling Chat Completion API...");

        ChatCompletion completion;
        try
        {
            completion = await _chatClient.CompleteChatAsync(messages, options, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling OpenAI chat completion");
            throw;
        }

        var toolCall = completion.ToolCalls.FirstOrDefault();
        if (toolCall == null)
        {
            _logger.LogWarning("No tool call returned by AI.");
            return new BreakdownResponseDto { IsSplit = false };
        }

        _logger.LogInformation("Tool call received: {ToolCall}", toolCall.FunctionArguments.ToString());

        // Deserialise
        var aiResult = toolCall.FunctionArguments.ToObjectFromJson<BreakdownAiResult>();

        if (aiResult == null)
        {
            _logger.LogWarning("Failed to deserialize FunctionArguments.");
            return new BreakdownResponseDto { IsSplit = false };
        }

        _logger.LogInformation("AI result: Action={Action}, SubtaskCount={Count}",
            aiResult.Action, aiResult.Subtasks?.Count ?? 0);

        if (!string.Equals(aiResult.Action, "split", StringComparison.OrdinalIgnoreCase)
            || aiResult.Subtasks == null || aiResult.Subtasks.Count == 0)
        {
            _logger.LogInformation("AI chose not to split the task. Returning original.");
            return new BreakdownResponseDto
            {
                IsSplit = false,
                Subtasks = new List<TaskItemDto>
                {
                    new TaskItemDto
                    {
                        Id = 0,
                        Title = title,
                        Description = description ?? "",
                        IsDone = false,
                        DueDate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        HasTime = false,
                        Label = null
                    }
                }
            };
        }

        // Map to DTO
        var subtasks = aiResult.Subtasks.Select(s =>
        {
            var validatedLabel = AiLabelHelper.ValidateLabel(s.Label, labelNames);
            return new TaskItemDto
            {
                Id = 0,
                Title = s.Title,
                Description = s.Description,
                IsDone = false,
                DueDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                HasTime = false,
                Label = AiLabelHelper.ResolveLabel(validatedLabel, labels)
            };
        }).ToList();

        _logger.LogInformation("Returning {Count} subtasks.", subtasks.Count);

        return new BreakdownResponseDto
        {
            IsSplit = true,
            Subtasks = subtasks
        };
    }

}
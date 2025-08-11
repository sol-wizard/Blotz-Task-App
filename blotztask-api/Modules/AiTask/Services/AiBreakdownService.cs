using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BlotzTask.Modules.AiTask.DTOs;
using OpenAI.Chat;

namespace BlotzTask.Modules.AiTask.Services;

public interface IAiBreakdownService
{
    Task<BreakdownResponseDto> BreakdownTaskAsync(AiBreakdownTaskInputDto task, CancellationToken ct = default);
}

public class AiBreakdownService : IAiBreakdownService
{
    private readonly ChatClient _chatClient;
    private readonly ILogger<AiBreakdownService> _logger;

    public AiBreakdownService(ChatClient chatClient, ILogger<AiBreakdownService> logger)
    {
        _chatClient = chatClient;
        _logger = logger;
    }

    public async Task<BreakdownResponseDto> BreakdownTaskAsync(AiBreakdownTaskInputDto originalTask, CancellationToken ct)
    {
        _logger.LogInformation("Starting task breakdown for: {Title}", originalTask.Title);

        // Pass Label to System Prompt
        var systemPrompt = @$"
        You are an assistant that helps users break down large tasks into smaller, manageable subtasks.

        Your goal is to reduce cognitive overload for neurodiverse users by:
        - Identifying when a task can be broken down
        - Returning subtasks only if decomposition is clearly beneficial
        - Keeping subtasks concise, actionable, and easy to follow

        Rules:
        - If the task is simple and doesn't need splitting, reply with:
        {{
        ""action"": ""no_split""
        }}
        - If splitting helps, reply with:
        {{
        ""action"": ""split""
        ""subtasks"": [
            {{
            ""title"": string,
            ""description"": string
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
            {{ ""title"": ""Book a venue"", ""description"": ""Reserve a place for the party.""}},
            {{ ""title"": ""Send invitations"", ""description"": ""Notify friends and family.""}},
            {{ ""title"": ""Order a cake"", ""description"": ""Get a unicorn-themed cake.""}},
            {{ ""title"": ""Arrange decorations"", ""description"": ""Buy and set up decorations.""}}
        ]
        }}

        Now assess the following task:

        Title: {originalTask.Title}
        Description: {originalTask.Description}
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
                                description = new { type = "string", description = "Subtask description" }
                            },
                            required = new[] { "title", "description" }
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
            return new BreakdownResponseDto
            {
                Subtasks = null,
                message = "AI could not process the task. Please try rephrasing it."
            };
        }

        _logger.LogInformation("Tool call received: {ToolCall}", toolCall.FunctionArguments.ToString());

        // Deserialise
        var aiResult = toolCall.FunctionArguments.ToObjectFromJson<AiBreakdownResult>();

        if (aiResult == null)
        {
            _logger.LogWarning("Failed to deserialize FunctionArguments.");
            return new BreakdownResponseDto
            {
                Subtasks = null,
                message = "AI response could not be understood. Please try again or simplify the task description."
            };
        }

        _logger.LogInformation("AI result: Action={Action}, SubtaskCount={Count}",
            aiResult.Action, aiResult.Subtasks?.Count ?? 0);

        if (!string.Equals(aiResult.Action, "split", StringComparison.OrdinalIgnoreCase)
            || aiResult.Subtasks == null || aiResult.Subtasks.Count == 0)
        {
            _logger.LogInformation("AI chose not to split the task.");
            return new BreakdownResponseDto
            {
                message = "This task seems simple enough and doesn't need to be split.",
                Subtasks = []
            };
        }

        // Map to DTO
        var subtasks = aiResult.Subtasks.Select(s =>
        {
            return new AiBreakdownSubtask
            {
                Title = s.Title,
                Description = s.Description
            };
        }).ToList();

        _logger.LogInformation("Returning {Count} subtasks.", subtasks.Count);

        return new BreakdownResponseDto
        {
            message = "The task has been successfully split into subtasks.",
            Subtasks = subtasks
        };
    }

}
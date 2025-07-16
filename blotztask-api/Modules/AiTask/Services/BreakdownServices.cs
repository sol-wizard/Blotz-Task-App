using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BlotzTask.Modules.AiTask.DTOs;
using BlotzTask.Modules.Labels.Services;
using BlotzTask.Modules.Tasks.DTOs;
using OpenAI.Chat;

namespace BlotzTask.Modules.AiTask.Services;

public class BreakdownServices
{
    private readonly ILabelService _labelService;
    private readonly ChatClient _chatClient;

    public BreakdownServices(ChatClient chatClient, ILabelService labelService)
    {
        _chatClient = chatClient;
        _labelService = labelService;
    }

    public async Task<BreakdownResponseDto> BreakdownTodoAsync(string title, string? description, CancellationToken ct)
    {
        // 1. 获取标签信息
        var (labels, labelNames) = await AiLabelHelper.GetLabelInfoAsync(_labelService);
        var labelPrompt = AiLabelHelper.GetLabelPromptString(labelNames);

        // 2. 构造System Prompt
        var systemPrompt = @$"
    You are an assistant that helps users break down tasks into smaller subtasks.

    Rules:
    - If the task is simple and doesn't need splitting, reply with:
    {{""action"":""no_split""}}
    - If splitting helps, reply with:
    {{
    ""action"":""split"",
    ""subtasks"":[
        {{
        ""title"": string,
        ""description"": string,
        ""label"": string (must be one of: {labelPrompt})
        }}
    ]
    }}

    Task:
    Title: {title}
    Description: {description ?? "None"}
    ";

        // 3. 构造消息
        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(systemPrompt)
        };

        // 4. 定义Tool Schema
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
                required = new[] { "action" }
            })
        );

        // 5. 创建Options
        var options = new ChatCompletionOptions
        {
            Tools = { tool }
        };

        // 6. 调用Chat Completion
        ChatCompletion completion = await _chatClient.CompleteChatAsync(messages, options, ct);

        var toolCall = completion.ToolCalls.FirstOrDefault();
        if (toolCall == null)
        {
            return new BreakdownResponseDto
            {
                IsSplit = false
            };
        }

        // 7. 反序列化
        var aiResult = toolCall.FunctionArguments.ToObjectFromJson<BreakdownAiResult>();
        if (aiResult == null
            || string.Equals(aiResult.Action, "no_split", StringComparison.OrdinalIgnoreCase)
            || aiResult.Subtasks == null
            || aiResult.Subtasks.Count == 0)
        {
            return new BreakdownResponseDto
            {
                IsSplit = false
            };
        }

        // 8. 映射到DTO
        var subtasks = aiResult.Subtasks.Select(s =>
        {
            var validatedLabel = AiLabelHelper.ValidateLabel(s.Label, labelNames);
            return new TaskItemDto
            {
                Id = 0,
                Title = s.Title,
                Description = s.Description,
                IsDone = false,
                DueDate = DateTimeOffset.MinValue,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                HasTime = false,
                Label = AiLabelHelper.ResolveLabel(validatedLabel, labels)
            };
        }).ToList();

        return new BreakdownResponseDto
        {
            IsSplit = true,
            Subtasks = subtasks
        };
    }

}
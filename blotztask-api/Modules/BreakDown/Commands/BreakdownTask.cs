using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Xml;
using BlotzTask.Modules.BreakDown.DTOs;
using BlotzTask.Modules.BreakDown.prompt;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.BreakDown.Commands;
public class BreakdownTaskCommand
{
    [Required]
    public required int TaskId { get; init; }
}

public class BreakdownTaskCommandHandler(
    ILogger<BreakdownTaskCommandHandler> logger,
    GetTaskByIdQueryHandler getTaskByIdQueryHandler, 
    IChatCompletionService chatCompletionService) 
{
    public async Task<List<SubTask>> Handle(BreakdownTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Breaking down task {TaskId}", command.TaskId);
        
        var query = new GetTasksByIdQuery { TaskId = command.TaskId };
        var task = await getTaskByIdQueryHandler.Handle(query, ct);

        if (task == null)
        {
            throw new ArgumentException($"Task with ID {command.TaskId} not found.");
        }
        
        try
        {
            var chatHistory = new ChatHistory();
            
            chatHistory.AddSystemMessage(TaskBreakDownPrompt.TaskBreakdownSystemMessage);
            chatHistory.AddUserMessage(TaskBreakDownPrompt.TaskBreakdownUserMessage(task));
            
            
            var chatResults = await chatCompletionService.GetChatMessageContentAsync(
                chatHistory: chatHistory,
                cancellationToken: ct
            );

            var functionResultMessage = chatResults; 

            if (string.IsNullOrEmpty(functionResultMessage.Content))
            {
                logger.LogWarning("LLM returned no response for BreakdownTask.");
                return [];
            }

            try
            {
                logger.LogInformation("LLM raw result: {Content}", functionResultMessage.Content);

                // This DTO (GeneratedSubTaskList) *must* have the 'Subtasks' property 
                // to match the prompt's required output structure.
                var rawResult = JsonSerializer.Deserialize<GeneratedSubTaskList>(
                    functionResultMessage.Content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );
                
                if (rawResult == null || rawResult.Subtasks.Count == 0)
                {
                    // Check if the LLM returned a plain array instead of the object wrapper, 
                    // Add a fallback attempt to deserialize a plain array for robustness, 
                    // though the goal is to make the prompt strong enough to prevent this.
                    
                    try {
                        var rawArrayFallback = JsonSerializer.Deserialize<List<GeneratedSubTask>>(
                            functionResultMessage.Content, 
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                        );
                        if (rawArrayFallback != null && rawArrayFallback.Count > 0) {
                             logger.LogWarning("LLM returned plain JSON array, using fallback parser.");
                             return rawArrayFallback.Select(st => new SubTask { Title = st.Title, Duration = XmlConvert.ToTimeSpan(st.Duration), Order = st.Order}).ToList();
                        }
                    } catch (JsonException) {
                        // ignore, proceed to warning below
                    }

                    logger.LogWarning("LLM returned empty subtasks or failed to parse (check DTO for 'Subtasks' field).");
                    return [];
                }

                return rawResult.Subtasks.Select(st => new SubTask
                {
                    Title = st.Title,
                    Duration = XmlConvert.ToTimeSpan(st.Duration),
                    Order = st.Order,
                }).ToList();
            }
            catch (JsonException ex)
            {
                logger.LogError(ex, "Failed to parse LLM response JSON. Content: {Content}", functionResultMessage.Content);
                return [];
            }
        }
        catch (TaskCanceledException)
        {
            logger.LogWarning("BreakdownTask was canceled.");
            return [];
        }
        catch (Exception ex)
        {
            // ... (rest of the logging remains the same)
            logger.LogError(
                ex,
                "Unexpected error during BreakdownTask. TaskId: {TaskId}, Task: {@Task}, Exception: {Exception}, StackTrace: {StackTrace}, InnerException: {InnerException}",
                command.TaskId,
                task,
                ex,
                ex.StackTrace,
                ex.InnerException
            );
#if DEBUG
            if (System.Diagnostics.Debugger.IsAttached)
            {
                System.Diagnostics.Debugger.Break();
            }
#endif
            return [];
        }
    }
}
public class SubTask
{
    public string Title { get; set; } = string.Empty;
    public TimeSpan Duration { get; set; }
    public int Order { get; set; }
}

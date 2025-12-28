using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Xml;
using BlotzTask.Modules.BreakDown.DTOs;
using BlotzTask.Modules.BreakDown.Prompts;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace BlotzTask.Modules.BreakDown.Commands;

public class BreakdownTaskCommand
{
    [Required]
    public required int TaskId { get; init; }

    [Required]
    public required Guid UserId { get; init; }
}

public class BreakdownTaskCommandHandler(
    ILogger<BreakdownTaskCommandHandler> logger,
    GetTaskByIdQueryHandler getTaskByIdQueryHandler,
    Kernel kernel)
{
    public async Task<List<SubTask>> Handle(BreakdownTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Breaking down task {TaskId}", command.TaskId);

        var query = new GetTasksByIdQuery { TaskId = command.TaskId, UserId = command.UserId };
        var task = await getTaskByIdQueryHandler.Handle(query, ct);

        if (task == null)
        {
            throw new ArgumentException($"Task with ID {command.TaskId} not found.");
        }

        try
        {
            // Configure OpenAI execution settings with structured output
            // ResponseFormat = typeof(GeneratedSubTaskList) tells OpenAI to return JSON matching our DTO schema
            // This uses OpenAI's JSON Schema feature to enforce the response structure at the model level
            var executionSettings = new OpenAIPromptExecutionSettings
            {
                Temperature = 0.2, // Low temperature for more deterministic, consistent breakdowns
                ResponseFormat = typeof(GeneratedSubTaskList) // Enforces structured output via JSON Schema
            };

            // KernelArguments holds both the prompt variables and execution settings
            // SK will replace {{$title}}, {{$description}}, etc. in the prompt template
            var arguments = new KernelArguments(executionSettings)
            {
                ["title"] = task.Title,
                ["description"] = task.Description ?? "No description provided",
                ["startTime"] = task.StartTime?.DateTime.ToString("yyyy-MM-dd HH:mm") ?? "null",
                ["endTime"] = task.EndTime?.DateTime.ToString("yyyy-MM-dd HH:mm") ?? "null"
            };

            // InvokePromptAsync: SK's method for executing a prompt template with variable substitution
            // 1. Replaces {{$variable}} placeholders with values from arguments
            // 2. Sends the prompt to OpenAI with the specified execution settings
            // 3. Returns the structured JSON response
            var result = await kernel.InvokePromptAsync(
                TaskBreakdownPrompts.BreakdownPrompt,
                arguments,
                cancellationToken: ct
            );

            var responseContent = result.ToString();

            if (string.IsNullOrEmpty(responseContent))
            {
                logger.LogWarning("LLM returned no response for task breakdown");
                return [];
            }

            logger.LogInformation("LLM raw result: {Content}", responseContent);

            // Deserialize the structured JSON response into our DTO
            // Because we used ResponseFormat = typeof(GeneratedSubTaskList), 
            // OpenAI guarantees the response matches this schema
            var parsedResult = JsonSerializer.Deserialize<GeneratedSubTaskList>(
                responseContent,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            if (parsedResult == null)
            {
                logger.LogWarning("Failed to parse structured output into {Type}", nameof(GeneratedSubTaskList));
                return [];
            }

            // Map DTOs to domain entities
            // XmlConvert.ToTimeSpan parses ISO 8601 durations (PT30M, PT1H30M, PT24H)
            // Note: We constrain the LLM to use hours/minutes/seconds only (no days like PT1D)
            // to ensure XmlConvert can parse it correctly
            return parsedResult.Subtasks.Select(st => new SubTask
            {
                Title = st.Title,
                Duration = XmlConvert.ToTimeSpan(st.Duration), // Parses ISO 8601: PT30M, PT1H, PT24H
                Order = st.Order,
            }).ToList();
        }
        catch (JsonException ex)
        {
            // Should rarely happen with structured output, but log if it does
            logger.LogError(ex, "Failed to parse LLM response JSON. Content might be malformed");
            return [];
        }
        catch (TaskCanceledException)
        {
            // User or system canceled the request
            logger.LogWarning("Task breakdown was canceled");
            return [];
        }
        catch (Exception ex)
        {
            // Catch-all for unexpected errors (network issues, model errors, etc.)
            logger.LogError(
                ex,
                "Unexpected error during task breakdown. TaskId: {TaskId}, Exception: {Exception}",
                command.TaskId,
                ex.Message
            );
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

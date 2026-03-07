using System.Text.Json;
using BlotzTask.Modules.Notes.DTOs;
using BlotzTask.Modules.Notes.Prompts;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace BlotzTask.Modules.Notes.Commands;

public class NoteForEstimation
{
    public Guid Id { get; set; }
    public required string Text { get; set; }
}

public class TimeEstimateCommandHandler(ILogger<TimeEstimateCommandHandler> logger, Kernel kernel)
{
    public async Task<AITimeEstimationResult?> Handle(NoteForEstimation note, CancellationToken ct = default)
    {
        logger.LogInformation("AI is estimating time for floating task: {TaskId}", note.Id);

        try
        {
            var executionSettings = new OpenAIPromptExecutionSettings
            {
                ResponseFormat = typeof(AITimeEstimationResult)
            };

            var arguments = new KernelArguments(executionSettings)
            {
                ["text"] = note.Text
            };

            var result = await kernel.InvokePromptAsync(
                TaskTimeEstimatePrompts.Prompt,
                arguments,
                cancellationToken: ct
            );
            var responseContent = result.ToString();

            if (string.IsNullOrEmpty(responseContent))
            {
                logger.LogWarning("LLM returned no response for task time estimation.");
                return null;
            }

            logger.LogInformation("AI time estimation result - raw: {Content}", responseContent);

            var parsedResult = JsonSerializer.Deserialize<AITimeEstimationResult>(
                responseContent,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            if (parsedResult == null)
            {
                logger.LogWarning("Failed to parse AI time estimation result into {Type}",
                    nameof(AITimeEstimationResult));
                return null;
            }


            return parsedResult;
        }
        catch (JsonException ex)
        {
            // Should rarely happen with structured output, but log if it does
            logger.LogError(ex, "Failed to parse LLM response JSON. Content might be malformed");
            return null;
        }
        catch (TaskCanceledException)
        {
            // User or system canceled the request
            logger.LogWarning("Task breakdown was canceled");
            return null;
        }
        catch (Exception ex)
        {
            // Catch-all for unexpected errors (network issues, model errors, etc.)
            logger.LogError(
                ex,
                "Unexpected error during task time estimate. TaskId: {TaskId}, Exception: {Exception}",
                note.Id,
                ex.Message
            );
            return null;
        }
    }
}

public class NoteTimeEstimation
{
    public Guid NoteId { get; set; }
    public TimeSpan Duration { get; set; }
}
using System.Text.Json;
using BlotzTask.Modules.TimeEstimate.DTOs;
using BlotzTask.Modules.TimeEstimate.Prompts;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace BlotzTask.Modules.TimeEstimate.Commands;

public class NoteForEstimation
{
    public int Id { get; set; }
    public string Text { get; set; }
}

public class TimeEstimateCommandHandler(ILogger<TimeEstimateCommandHandler> logger, Kernel kernel)
{
    public async Task<NoteTimeEstimation> Handle(NoteForEstimation note, CancellationToken ct = default)
    {
        logger.LogInformation("AI is estimating time for floating task: {TaskId}", note.Id);

        try
        {
            var executionSettings = new OpenAIPromptExecutionSettings
            {
                ResponseFormat = typeof(AITimeEstimation)
            };

            var arguments = new KernelArguments(executionSettings)
            {
                ["title"] = note.Text
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

            var parsedResult = JsonSerializer.Deserialize<AITimeEstimation>(
                responseContent,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            if (parsedResult == null)
            {
                logger.LogWarning("Failed to parse AI time estimation result into {Type}", nameof(AITimeEstimation));
                return null;
            }

            var timeEstimationResult = new NoteTimeEstimation
            {
                NoteId = note.Id,
                Duration = parsedResult.Duration
            };
            return timeEstimationResult;
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
    public int NoteId { get; set; }
    public TimeSpan Duration { get; set; }
}
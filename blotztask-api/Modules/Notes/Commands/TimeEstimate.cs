using System.Text.Json;
using BlotzTask.Modules.Notes.DTOs;
using BlotzTask.Modules.Notes.Prompts;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Shared.Exceptions;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace BlotzTask.Modules.Notes.Commands;

public class NoteTimeEstimationDto
{
    public Guid Id { get; set; }

    public required string Text { get; set; }
}

public class NoteTimeEstimationRequest
{
    public Guid NoteId { get; set; }
    public Guid UserId { get; set; }
    public required string Text { get; set; }
}

public class TimeEstimateCommandHandler(
    ILogger<TimeEstimateCommandHandler> logger,
    GetUserPreferencesQueryHandler getUserPreferencesQueryHandler,
    Kernel kernel)
{
    public async Task<AITimeEstimationResult?> Handle(NoteTimeEstimationRequest request, CancellationToken ct = default)
    {
        logger.LogInformation("AI is estimating time for floating task: {TaskId}", request.NoteId);

        var userPreferencesQuery = new GetUserPreferencesQuery { UserId = request.UserId };
        var userPreferences = await getUserPreferencesQueryHandler.Handle(userPreferencesQuery, ct);

        var preferredLanguageString = userPreferences.PreferredLanguage switch
        {
            Language.En => "English",
            Language.Zh => "Chinese (Simplified)",
            _ => "English"
        };

        try
        {
            var executionSettings = new OpenAIPromptExecutionSettings
            {
                ResponseFormat = typeof(AITimeEstimationResult)
            };

            var arguments = new KernelArguments(executionSettings)
            {
                ["text"] = request.Text
            };

            var result = await kernel.InvokePromptAsync(
                TaskTimeEstimatePrompts.GetTimeEstimatePrompt(preferredLanguageString),
                arguments,
                cancellationToken: ct
            );
            var responseContent = result.ToString();

            if (string.IsNullOrEmpty(responseContent))
            {
                logger.LogWarning("LLM returned no response for task time estimation.");
                throw new AiEmptyResponseException("LLM returned no response for task time estimation.");
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
                throw new AiInvalidJsonException(responseContent);
            }


            return parsedResult;
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Failed to parse LLM response JSON. Content might be malformed");
            throw new AiInvalidJsonException("Malformed JSON response from time estimation model.", ex);
        }
        catch (OperationCanceledException oce)
        {
            logger.LogWarning(oce, "Task time estimation was canceled");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        catch (HttpOperationException ex) when (
            ex.Message.Contains("429", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("quota", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("token", StringComparison.OrdinalIgnoreCase)
        )
        {
            logger.LogWarning(ex, "Token limit exceeded during task time estimation.");
            throw new AiTokenLimitedException();
        }
        catch (HttpOperationException ex) when (
            ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase)
        )
        {
            logger.LogWarning(ex, "Request blocked by Azure OpenAI content filter during task time estimation.");
            throw new AiContentFilterException();
        }
        catch (AiTaskGenerationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Unexpected error during task time estimate. TaskId: {TaskId}, Exception: {Exception}",
                request.NoteId,
                ex.Message
            );
            throw new AiTaskGenerationException(
                AiErrorCode.Unknown,
                "An unhandled exception occurred during task time estimate.",
                ex
            );
        }
    }
}

public class NoteTimeEstimation
{
    public Guid NoteId { get; set; }
    public TimeSpan Duration { get; set; }
}
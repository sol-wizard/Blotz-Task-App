using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using BlotzTask.Modules.BreakDown.DTOs;
using BlotzTask.Modules.BreakDown.Prompts;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Shared.Exceptions;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace BlotzTask.Modules.BreakDown.Commands;

public class BreakdownTaskCommand
{
    [Required] public required int TaskId { get; init; }

    [Required] public required Guid UserId { get; init; }
}

public class BreakdownTaskCommandHandler(
    ILogger<BreakdownTaskCommandHandler> logger,
    GetTaskByIdQueryHandler getTaskByIdQueryHandler,
    GetUserPreferencesQueryHandler getUserPreferencesQueryHandler,
    Kernel kernel)
{
    public async Task<BreakdownMessage> Handle(BreakdownTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Breaking down task {TaskId}", command.TaskId);

        var query = new GetTasksByIdQuery { TaskId = command.TaskId, UserId = command.UserId };
        var task = await getTaskByIdQueryHandler.Handle(query, ct);

        if (task == null) throw new ArgumentException($"Task with ID {command.TaskId} not found.");

        // Fetch user preferences to get preferred language
        var userPreferencesQuery = new GetUserPreferencesQuery { UserId = command.UserId };
        var userPreferences = await getUserPreferencesQueryHandler.Handle(userPreferencesQuery, ct);

        // Convert Language enum to a readable string for the AI
        var preferredLanguageString = userPreferences.PreferredLanguage switch
        {
            Language.En => "English",
            Language.Zh => "Chinese (Simplified)",
            _ => "English" // Default fallback
        };

        try
        {
            // Configure OpenAI execution settings with structured output
            // ResponseFormat = typeof(GeneratedSubTaskList) tells OpenAI to return JSON matching our DTO schema
            // This uses OpenAI's JSON Schema feature to enforce the response structure at the model level
            var executionSettings = new OpenAIPromptExecutionSettings
            {
                ResponseFormat = typeof(BreakdownMessage) // Enforces structured output via JSON Schema
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
                TaskBreakdownPrompts.GetBreakdownPrompt(
                    preferredLanguageString
                ),
                arguments,
                cancellationToken: ct
            );

            var responseContent = result.ToString();

            if (string.IsNullOrWhiteSpace(responseContent))
            {
                logger.LogWarning("LLM returned no response for task breakdown");
                throw new AiEmptyResponseException("LLM returned no response for task breakdown.");
            }

            logger.LogInformation("LLM raw result: {Content}", responseContent);

            // Deserialize the structured JSON response into our DTO
            // Because we used ResponseFormat = typeof(GeneratedSubTaskList),
            // OpenAI guarantees the response matches this schema
            var parsedResult = JsonSerializer.Deserialize<BreakdownMessage>(
                responseContent,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            if (parsedResult == null)
            {
                logger.LogWarning("Failed to parse structured output into {Type}", nameof(BreakdownMessage));
                throw new AiInvalidJsonException(responseContent);
            }

            return parsedResult;
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Failed to parse LLM response JSON. Content might be malformed");
            throw new AiInvalidJsonException("Malformed JSON response from task breakdown model.", ex);
        }
        catch (OperationCanceledException oce)
        {
            logger.LogWarning(oce, "Task breakdown was canceled");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        catch (TokenLimitExceededException ex)
        {
            logger.LogWarning(ex, "Token limit exceeded during task breakdown.");
            throw new AiTokenLimitedException();
        }
        catch (HttpOperationException ex)
            when (ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Request blocked by Azure OpenAI content filter during task breakdown.");
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
                "Unexpected error during task breakdown. TaskId: {TaskId}, Exception: {Exception}",
                command.TaskId,
                ex.Message
            );
            throw new AiTaskGenerationException(
                AiErrorCode.Unknown,
                "An unhandled exception occurred during task breakdown.",
                ex
            );
        }
    }
}
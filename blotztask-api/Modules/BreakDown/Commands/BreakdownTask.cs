using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using Azure.AI.Projects;
using BlotzTask.Modules.BreakDown.DTOs;
using BlotzTask.Modules.BreakDown.Prompts;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Shared.Exceptions;
using Microsoft.Agents.AI.Foundry;
using Microsoft.Extensions.AI;

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
    AIProjectClient projectClient,
    IConfiguration configuration)
{
    private readonly string _deploymentId =
        configuration["AzureOpenAI:AiModels:Breakdown:DeploymentId"]
        ?? throw new InvalidOperationException("Missing AzureOpenAI:AiModels:Breakdown:DeploymentId config.");

    public async Task<BreakdownResult> Handle(BreakdownTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Breaking down task {TaskId}", command.TaskId);

        var query = new GetTasksByIdQuery { TaskId = command.TaskId, UserId = command.UserId };
        var task = await getTaskByIdQueryHandler.Handle(query, ct);

        if (task == null) throw new ArgumentException($"Task with ID {command.TaskId} not found.");

        var userPreferencesQuery = new GetUserPreferencesQuery { UserId = command.UserId };
        var userPreferences = await getUserPreferencesQueryHandler.Handle(userPreferencesQuery, ct);

        var preferredLanguage = userPreferences.PreferredLanguage.ToDisplayName();

        var collectedSubTasks = new List<GeneratedSubTask>();

        [Description("Add a subtask to the breakdown result")]
        void AddSubTask(
            [Description("A short, descriptive name for the subtask")] string title,
            [Description("Duration in ISO 8601 format (e.g., PT30M, PT1H30M, PT24H). Never use PT1D.")] string duration,
            [Description("Sequential order starting from 1")] int order)
        {
            collectedSubTasks.Add(new GeneratedSubTask
            {
                Title = title,
                Duration = duration,
                Order = order
            });
        }

        try
        {
            var prompt = TaskBreakdownPrompts.GetBreakdownPrompt(
                preferredLanguage,
                task.Title,
                task.Description ?? "No description provided",
                task.StartTime?.DateTime.ToString("yyyy-MM-dd HH:mm") ?? "null",
                task.EndTime?.DateTime.ToString("yyyy-MM-dd HH:mm") ?? "null");

            var agent = projectClient.AsAIAgent(
                model: _deploymentId,
                instructions: prompt,
                tools: [AIFunctionFactory.Create(AddSubTask)]);

            logger.LogInformation("Breakdown: Invoking AI with deployment={DeploymentId}", _deploymentId);

            await agent.RunAsync("Break down this task into subtasks.", cancellationToken: ct);

            logger.LogInformation("Breakdown: Collected {Count} subtasks", collectedSubTasks.Count);

            var isSuccess = collectedSubTasks.Count > 0;

            return new BreakdownResult
            {
                IsSuccess = isSuccess,
                Subtasks = collectedSubTasks,
                ErrorMessage = isSuccess ? "" : "Could not generate subtasks for this task."
            };
        }
        catch (OperationCanceledException oce)
        {
            logger.LogWarning(oce, "Task breakdown was canceled");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        catch (Exception ex) when (
            ex.Message.Contains("429", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("quota", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("token", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Token limit exceeded during task breakdown.");
            throw new AiTokenLimitedException();
        }
        catch (Exception ex) when (
            ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Request blocked by content filter during task breakdown.");
            throw new AiContentFilterException();
        }
        catch (AiTaskGenerationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during task breakdown. TaskId: {TaskId}", command.TaskId);
            throw new AiTaskGenerationException(AiErrorCode.Unknown,
                "An unhandled exception occurred during task breakdown.", ex);
        }
    }
}

using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ClientModel;
using System.Diagnostics;
using Azure.AI.Projects;
using BlotzTask.Extension.Options;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.BreakDown.DTOs;
using BlotzTask.Modules.BreakDown.Prompts;
using BlotzTask.Modules.BreakDown.Services;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Shared.Exceptions;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;

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
    IOptions<AzureOpenAIOptions> options,
    ICheckAiQuotaService checkAiQuotaService,
    IRecordAiUsageService recordAiUsageService,
    BreakdownHedgePolicy hedgePolicy)
{
    private readonly string _deploymentId = options.Value.AiModels.Breakdown.DeploymentId;

    public async Task<BreakdownResult> Handle(BreakdownTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Breaking down task {TaskId}", command.TaskId);

        var query = new GetTasksByIdQuery { TaskId = command.TaskId, UserId = command.UserId };
        var task = await getTaskByIdQueryHandler.Handle(query, ct);

        if (task == null) throw new NotFoundException($"Task with ID {command.TaskId} not found.");

        var userPreferencesQuery = new GetUserPreferencesQuery { UserId = command.UserId };
        var userPreferences = await getUserPreferencesQueryHandler.Handle(userPreferencesQuery, ct);

        var preferredLanguage = userPreferences.PreferredLanguage.ToDisplayName();

        try
        {
            await checkAiQuotaService.CheckQuotaAsync(command.UserId, ct);
            var prompt = TaskBreakdownPrompts.GetBreakdownPrompt(
                preferredLanguage,
                task.Title,
                task.Description ?? "No description provided",
                task.StartTime?.DateTime.ToString("yyyy-MM-dd HH:mm") ?? "null",
                task.EndTime?.DateTime.ToString("yyyy-MM-dd HH:mm") ?? "null");

            // A slow AI call is asked again once (a hedged request); whichever answers first is used.
            // Only the AI call runs twice: the task, preferences and quota above are read once.
            var stopwatch = Stopwatch.StartNew();
            var hedged = false;
            HedgedResult<(AgentResponse Response, List<GeneratedSubTask> Subtasks)> run;
            try
            {
                run = await HedgedRequest.RunAsync(
                    callCt => RunAgentOnceAsync(prompt, callCt),
                    hedgePolicy.GetHedgeDelay(),
                    ct,
                    tryStartHedge: () => hedged = hedgePolicy.TryStartHedge());
            }
            finally
            {
                // Failed runs count too: during an outage the AI often fails slowly, and the policy must see that.
                // A cancelled request says nothing about the AI's speed, so it's left out, unless it took a
                // hedge place, which must be given back.
                if (!ct.IsCancellationRequested || hedged) hedgePolicy.RecordRun(stopwatch.Elapsed, hedged);
            }

            var (response, collectedSubTasks) = run.Value;
            int inputTokens = (int)(response.Usage?.InputTokenCount ?? 0);
            int outputTokens = (int)(response.Usage?.OutputTokenCount ?? 0);
            int totalTokens = (int)(response.Usage?.TotalTokenCount ?? 0);
            await recordAiUsageService.RecordAiUsageAsync(new RecordAiUsageRequest
            {
                UserId = command.UserId,
                InputTokens = inputTokens,
                OutputTokens = outputTokens,
                TotalTokens = totalTokens
            }, ct);

            logger.LogInformation(
                "Breakdown: Collected {Count} subtasks | InputTokens={InputTokens} | OutputTokens={OutputTokens} | TotalTokens={TotalTokens} | Hedged={Hedged} | DurationMs={DurationMs}",
                collectedSubTasks.Count, inputTokens, outputTokens, totalTokens, hedged, stopwatch.ElapsedMilliseconds);

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
        catch (ClientResultException ex) when (ex.Status == 429)
        {
            logger.LogError(ex, "Azure AI rate limit hit during task breakdown.");
            throw new AzureAiException();
        }
        catch (ClientResultException ex) when (
            ex.Status == 400 &&
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
            logger.LogWarning(ex, "Unexpected error during task breakdown. TaskId: {TaskId}", command.TaskId);
            throw new AiTaskGenerationException(AiErrorCode.Unknown,
                "An unhandled exception occurred during task breakdown.", ex);
        }
    }

    // One AI call with its own subtask list, so two calls running side by side never mix their subtasks.
    private async Task<(AgentResponse Response, List<GeneratedSubTask> Subtasks)> RunAgentOnceAsync(
        string prompt, CancellationToken ct)
    {
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

        var agent = projectClient.AsAIAgent(
            model: _deploymentId,
            instructions: prompt,
            tools: [AIFunctionFactory.Create(AddSubTask)]);

        var response = await agent.RunAsync("Break down this task into subtasks.", cancellationToken: ct);
        return (response, collectedSubTasks);
    }
}

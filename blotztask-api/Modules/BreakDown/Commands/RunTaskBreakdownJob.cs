using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.BreakDown.Enums;
using BlotzTask.Modules.BreakDown.Services;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.BreakDown.Commands;

// Runs one queued breakdown in the background: calls the AI, saves the subtasks, then marks the job.
public class RunTaskBreakdownJobCommandHandler(
    BlotzTaskDbContext db,
    BreakdownTaskCommandHandler breakdownTaskCommandHandler,
    ReplaceSubtasksCommandHandler replaceSubtasksCommandHandler,
    IConfiguration configuration,
    ILogger<RunTaskBreakdownJobCommandHandler> logger)
{
    // Testing only: makes every background breakdown this many seconds slower, to test a slow AI.
    // Defaults to 0. Set it only in the staging API's app settings (BreakdownJobs__TestDelaySeconds), never in production.
    public const string TestDelaySecondsKey = "BreakdownJobs:TestDelaySeconds";

    // ct is the API's shutdown token, never a request's: the run must finish after the app stops waiting.
    public async Task Handle(BreakdownJobRequest request, CancellationToken ct)
    {
        var job = await db.TaskBreakdownJobs.AsNoTracking()
            .FirstOrDefaultAsync(j => j.TaskItemId == request.TaskItemId, ct);
        if (job is null || job.Status != BreakdownJobStatus.Running)
        {
            // The task was deleted, or this run was already finished.
            return;
        }

        // Identifies this run, so an old run finishing late can't overwrite a newer one.
        var startedAt = job.StartedAtUtc;

        try
        {
            var testDelaySeconds = configuration.GetValue<int>(TestDelaySecondsKey);
            if (testDelaySeconds > 0)
            {
                logger.LogWarning("Delaying breakdown for task {TaskId} by {Seconds}s (test setting)",
                    request.TaskItemId, testDelaySeconds);
                await Task.Delay(TimeSpan.FromSeconds(testDelaySeconds), ct);
            }

            var result = await breakdownTaskCommandHandler.Handle(new BreakdownTaskCommand
            {
                TaskId = request.TaskItemId,
                UserId = request.UserId
            }, ct);

            if (!result.IsSuccess)
            {
                await FinishAsync(request, startedAt, BreakdownJobStatus.Failed, AiErrorCode.NoTasksExtracted.ToString(), ct);
                return;
            }

            // A run that outlived MaxRunTime may have been replaced by a newer one: don't overwrite its subtasks.
            var stillCurrent = await db.TaskBreakdownJobs.AnyAsync(j => j.TaskItemId == request.TaskItemId
                                                                        && j.Status == BreakdownJobStatus.Running
                                                                        && j.StartedAtUtc == startedAt, ct);
            if (!stillCurrent)
            {
                logger.LogInformation("Breakdown for task {TaskId} finished after a newer run started; result dropped",
                    request.TaskItemId);
                return;
            }

            await replaceSubtasksCommandHandler.Handle(new ReplaceSubtasksCommand
            {
                TaskId = request.TaskItemId,
                Subtasks = result.Subtasks.Select(subtask => new SubtaskDto
                {
                    Title = subtask.Title,
                    Duration = subtask.Duration,
                    Order = subtask.Order
                }).ToList()
            }, ct);

            await FinishAsync(request, startedAt, BreakdownJobStatus.Succeeded, null, ct);
        }
        catch (Exception) when (ct.IsCancellationRequested)
        {
            // The API is shutting down: leave the job Running, it reports failed after the maximum run time.
        }
        catch (NotFoundException)
        {
            logger.LogInformation("Task {TaskId} was deleted during its breakdown", request.TaskItemId);
        }
        catch (AiTaskGenerationException ex)
        {
            logger.LogWarning(ex, "Breakdown failed for task {TaskId}: {Code}", request.TaskItemId, ex.Code);
            await FinishAsync(request, startedAt, BreakdownJobStatus.Failed, ex.Code.ToString(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error in breakdown for task {TaskId}", request.TaskItemId);
            await FinishAsync(request, startedAt, BreakdownJobStatus.Failed, AiErrorCode.Unknown.ToString(), ct);
        }
    }

    private async Task FinishAsync(
        BreakdownJobRequest request,
        DateTimeOffset startedAt,
        BreakdownJobStatus status,
        string? errorCode,
        CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        await db.TaskBreakdownJobs
            .Where(j => j.TaskItemId == request.TaskItemId
                        && j.Status == BreakdownJobStatus.Running
                        && j.StartedAtUtc == startedAt)
            .ExecuteUpdateAsync(s => s
                .SetProperty(j => j.Status, status)
                .SetProperty(j => j.UpdatedAtUtc, now)
                .SetProperty(j => j.ErrorCode, errorCode), ct);
    }
}

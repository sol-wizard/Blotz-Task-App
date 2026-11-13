using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.BreakDown.Domain;
using BlotzTask.Modules.BreakDown.Enums;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.BreakDown.Commands;

public class StartTaskBreakdownCommand
{
    public required int TaskItemId { get; init; }
    public required Guid UserId { get; init; }
}

public class StartTaskBreakdownResult
{
    public required int TaskItemId { get; init; }

    // True when this call claimed the job, so the caller must queue the run.
    // False when a run for this task is already going: the caller just reports it.
    public required bool Started { get; init; }
}

public class StartTaskBreakdownCommandHandler(
    BlotzTaskDbContext db,
    ICheckAiQuotaService checkAiQuotaService,
    ILogger<StartTaskBreakdownCommandHandler> logger)
{
    public async Task<StartTaskBreakdownResult> Handle(StartTaskBreakdownCommand command, CancellationToken ct = default)
    {
        var taskExists = await db.TaskItems.AnyAsync(
            t => t.Id == command.TaskItemId && t.UserId == command.UserId, ct);
        if (!taskExists) throw new NotFoundException($"Task with ID {command.TaskItemId} not found.");

        // Refuse at once when the user is out of quota, instead of starting a run that can only fail.
        await checkAiQuotaService.CheckQuotaAsync(command.UserId, ct);

        var now = DateTimeOffset.UtcNow;
        var lostBefore = TaskBreakdownJob.LostBefore(now);

        // Claim an existing row in one statement, so two taps at the same moment can't both claim it.
        var claimed = await db.TaskBreakdownJobs
            .Where(j => j.TaskItemId == command.TaskItemId
                        && (j.Status != BreakdownJobStatus.Running || j.StartedAtUtc < lostBefore))
            .ExecuteUpdateAsync(s => s
                .SetProperty(j => j.Status, BreakdownJobStatus.Running)
                .SetProperty(j => j.StartedAtUtc, now)
                .SetProperty(j => j.UpdatedAtUtc, now)
                .SetProperty(j => j.ErrorCode, (string?)null), ct);

        if (claimed == 1) return Result(command, started: true);

        var hasJob = await db.TaskBreakdownJobs.AnyAsync(j => j.TaskItemId == command.TaskItemId, ct);
        if (hasJob) return Result(command, started: false);

        var job = new TaskBreakdownJob
        {
            TaskItemId = command.TaskItemId,
            Status = BreakdownJobStatus.Running,
            StartedAtUtc = now,
            UpdatedAtUtc = now
        };
        db.TaskBreakdownJobs.Add(job);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            db.Entry(job).State = EntityState.Detached;
            // Only a row inserted by another request (unique index on TaskItemId) means "already started".
            // Anything else, e.g. the task was deleted a moment ago, is a real error.
            var insertedByOther = await db.TaskBreakdownJobs.AnyAsync(j => j.TaskItemId == command.TaskItemId, ct);
            if (!insertedByOther) throw;

            logger.LogInformation("Breakdown for task {TaskId} was already started by another request", command.TaskItemId);
            return Result(command, started: false);
        }

        return Result(command, started: true);
    }

    private static StartTaskBreakdownResult Result(StartTaskBreakdownCommand command, bool started) =>
        new() { TaskItemId = command.TaskItemId, Started = started };
}

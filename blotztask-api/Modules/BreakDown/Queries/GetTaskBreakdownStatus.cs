using System.Text.Json.Serialization;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.BreakDown.Domain;
using BlotzTask.Modules.BreakDown.Enums;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.BreakDown.Queries;

public class GetTaskBreakdownStatusQuery
{
    public required int TaskItemId { get; init; }
    public required Guid UserId { get; init; }
}

public class TaskBreakdownStatusDto
{
    [JsonPropertyName("taskItemId")] public required int TaskItemId { get; init; }

    // Null when this task has never been broken down.
    [JsonConverter(typeof(JsonStringEnumConverter))]
    [JsonPropertyName("status")]
    public BreakdownJobStatus? Status { get; init; }

    // Set only when Status is Failed.
    [JsonPropertyName("errorCode")] public string? ErrorCode { get; init; }

    // Set only while Running: how long the app waits before asking again. The app never picks its own interval.
    [JsonPropertyName("retryAfterSeconds")] public int? RetryAfterSeconds { get; init; }
}

public class GetTaskBreakdownStatusQueryHandler(BlotzTaskDbContext db)
{
    public const int RetryAfterSeconds = 2;
    public const string TimedOutErrorCode = "TimedOut";

    public async Task<TaskBreakdownStatusDto> Handle(GetTaskBreakdownStatusQuery query, CancellationToken ct = default)
    {
        var taskExists = await db.TaskItems.AnyAsync(
            t => t.Id == query.TaskItemId && t.UserId == query.UserId, ct);
        if (!taskExists) throw new NotFoundException($"Task with ID {query.TaskItemId} not found.");

        var job = await db.TaskBreakdownJobs.AsNoTracking()
            .FirstOrDefaultAsync(j => j.TaskItemId == query.TaskItemId, ct);

        if (job is null) return new TaskBreakdownStatusDto { TaskItemId = query.TaskItemId };

        // A run still "Running" past the maximum time was lost (e.g. the API restarted): report it as failed.
        var lost = job.Status == BreakdownJobStatus.Running
                   && job.StartedAtUtc < TaskBreakdownJob.LostBefore(DateTimeOffset.UtcNow);
        if (lost)
        {
            return new TaskBreakdownStatusDto
            {
                TaskItemId = job.TaskItemId,
                Status = BreakdownJobStatus.Failed,
                ErrorCode = TimedOutErrorCode
            };
        }

        return new TaskBreakdownStatusDto
        {
            TaskItemId = job.TaskItemId,
            Status = job.Status,
            ErrorCode = job.ErrorCode,
            RetryAfterSeconds = job.Status == BreakdownJobStatus.Running ? RetryAfterSeconds : null
        };
    }
}

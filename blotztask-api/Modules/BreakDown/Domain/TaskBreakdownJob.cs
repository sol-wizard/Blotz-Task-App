using BlotzTask.Modules.BreakDown.Enums;

namespace BlotzTask.Modules.BreakDown.Domain;

// The latest breakdown run for a task. One row per task: starting again reuses the row.
public class TaskBreakdownJob
{
    // A run still "Running" after this long was lost (e.g. the API restarted): it reports failed and can start again.
    public static readonly TimeSpan MaxRunTime = TimeSpan.FromMinutes(5);

    // Runs that started before this moment count as lost.
    public static DateTimeOffset LostBefore(DateTimeOffset now) => now - MaxRunTime;

    public int Id { get; set; }
    public int TaskItemId { get; set; }
    public BreakdownJobStatus Status { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    // Set only when Status is Failed, e.g. "Unknown" or "ContentFiltered".
    public string? ErrorCode { get; set; }
}

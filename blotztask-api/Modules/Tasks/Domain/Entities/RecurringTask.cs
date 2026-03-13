using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Users.Domain;

namespace BlotzTask.Modules.Tasks.Domain.Entities;

public class RecurrencePattern
{
    public required RecurrenceFrequency Frequency { get; set; }

    // Every N days / N weeks / N months
    public int Interval { get; set; } = 1;

    // Only set when Frequency == Weekly
    public int? DaysOfWeek { get; set; }

    // Only set when Frequency == Monthly; falls back to RecurringTask.StartDate.Day if null
    public int? DayOfMonth { get; set; }
}

public class RecurringTask
{
    public int Id { get; set; }

    public required Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // Template fields — copied into each generated TaskItem
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required TaskTimeType TimeType { get; set; }
    public int? LabelId { get; set; }
    public Label? Label { get; set; }

    // The time-of-day and timezone for generated tasks.
    // Date part is irrelevant — only TimeOfDay and Offset are used at generation time.
    public required DateTimeOffset TemplateStartTime { get; set; }

    // Only set for RangeTime tasks. Null means SingleTime (start == end).
    public DateTimeOffset? TemplateEndTime { get; set; }

    // How the task repeats
    public required RecurrencePattern Pattern { get; set; }

    // Lifecycle
    public required DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsActive { get; set; } = true;

    // Watermark: instances have been generated up to (and including) this date
    public DateOnly GeneratedUpTo { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

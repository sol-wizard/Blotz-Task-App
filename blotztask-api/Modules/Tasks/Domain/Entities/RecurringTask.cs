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

    public required int SeriesId { get; set; }
    public RecurringTaskSeries Series { get; set; } = null!;
    public int? PreviousRecurringTaskId { get; set; }
    public RecurringTask? PreviousRecurringTask { get; set; }

    public required Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // Template fields — copied into each generated TaskItem
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required TaskTimeType TimeType { get; set; }
    public int? LabelId { get; set; }
    public Label? Label { get; set; }

    // The date part is relevant only to the initial template date.
    // Future occurrences use TimeOfDay plus ScheduleTimeZoneId to resolve the correct offset.
    public required DateTimeOffset TemplateStartTime { get; set; }

    // Only set for RangeTime tasks. Null means SingleTime (start == end).
    public DateTimeOffset? TemplateEndTime { get; set; }

    public required string ScheduleTimeZoneId { get; set; }

    // Deadline template fields. When enabled, each occurrence gets a TaskDeadline
    // derived from its occurrence date plus this relative deadline template.
    public bool IsDeadline { get; set; } = false;
    public int? DeadlineOffsetDays { get; set; }
    public TimeOnly? DeadlineTimeOfDay { get; set; }
    public string? DeadlineTimeZoneId { get; set; }

    // How the task repeats
    public required RecurrencePattern Pattern { get; set; }

    // Lifecycle
    public required DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

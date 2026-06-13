using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.Tasks.Domain.Entities;

public class RecurringOccurrenceOverride
{
    public int Id { get; set; }
    public required int SeriesId { get; set; }
    public RecurringTaskSeries Series { get; set; } = null!;
    public required int RecurringTaskId { get; set; }
    public RecurringTask RecurringTask { get; set; } = null!;
    public required DateOnly OccurrenceDate { get; set; }
    public required RecurringOccurrenceOverrideType OverrideType { get; set; }
    public TaskItem? TaskItem { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.DailyReminderGenerator.Dtos;

public class TodayTaskItemDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public LabelDto? Label { get; set; }
    public TaskTimeType? TimeType { get; set; }
}
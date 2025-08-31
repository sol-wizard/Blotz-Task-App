namespace BlotzTask.Modules.Tasks.DTOs;

public class AddTaskItemDto
{
    public string Title { get; set; }
    public string Description { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public int LabelId { get; set; }
    public bool HasTime { get; set; }
}

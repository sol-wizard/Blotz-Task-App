using BlotzTask.Modules.Labels.DTOs;

namespace BlotzTask.Modules.Tasks.DTOs;

public class TaskItemDto
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public DateTimeOffset EndTime { get; set; }
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public LabelDto Label { get; set; }
    public bool HasTime { get; set; } 

}
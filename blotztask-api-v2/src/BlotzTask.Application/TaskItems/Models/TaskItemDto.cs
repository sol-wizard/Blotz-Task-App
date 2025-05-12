using BlotzTask.Application.Labels.Models;

namespace BlotzTask.Application.TaskItems.Models;

public class TaskItemDto
{
    public required string Title { get; set; }
    public string Description { get; set; }
    public DateTimeOffset DueDate { get; set; }
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public LabelDto Label { get; set; }
    public bool HasTime { get; set; } 
}
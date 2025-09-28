namespace BlotzTask.Modules.Tasks.Domain.Entities;

public class Subtask
{
    public int Id { get; init; }
    public int ParentTaskId { get; init; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public TimeSpan? Duration { get; set; }
    public int Order { get; init; }
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; init; }     
    public DateTime UpdatedAt { get; set; }
    public TaskItem ParentTask { get; init; } = default!;
}

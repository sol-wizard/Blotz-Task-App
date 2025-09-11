namespace BlotzTask.Modules.Tasks.DTOs;

public class SubtaskDto
{ 
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TimeSpan? Duration { get; set; }
    public int Order { get; set; }
    public bool IsDone { get; set; } = false; // default for new subtasks
}
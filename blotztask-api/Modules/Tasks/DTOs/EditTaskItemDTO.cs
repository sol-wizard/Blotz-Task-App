namespace BlotzTask.Modules.Tasks.DTOs;

public class EditTaskItemDto
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public DateTimeOffset EndTime { get; set; } 
    public bool IsDone { get; set; }
    public int LabelId { get; set; }
    public bool HasTime { get; set; }
}
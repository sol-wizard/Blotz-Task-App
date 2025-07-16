namespace BlotzTask.Modules.Tasks.DTOs;

public class TaskStatusResultDto
{
    public int Id { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string Message {get; set;} = string.Empty;
}
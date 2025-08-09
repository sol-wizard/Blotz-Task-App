namespace BlotzTask.Shared.DTOs;

public class ExtractedTaskDto
{
    public string Title { get; set; }

    public string Description { get; set; } = "";
    
    public string? EndTime { get; set; }
}
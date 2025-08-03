namespace BlotzTask.Modules.AiTask.DTOs;

public class BreakdownResponseDto
{
    public List<AiBreakdownSubtask>? Subtasks { get; set; } = new();
    
    public string message { get; set; } = "";
}
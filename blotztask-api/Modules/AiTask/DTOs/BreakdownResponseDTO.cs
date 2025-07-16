using BlotzTask.Modules.Tasks.DTOs;

namespace BlotzTask.Modules.AiTask.DTOs;
public class BreakdownResponseDto
{
    public bool IsSplit { get; set; }
    public TaskItemDto? OriginalTask { get; set; }
    public List<TaskItemDto>? Subtasks { get; set; }
}

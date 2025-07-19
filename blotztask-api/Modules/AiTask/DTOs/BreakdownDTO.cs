using BlotzTask.Modules.Tasks.DTOs;

namespace BlotzTask.Modules.AiTask.DTOs;
public class BreakdownResponseDto
{
    public bool IsSplit { get; set; }
    public List<TaskItemDto>? Subtasks { get; set; }
}

public class BreakdownRequestDto
{
    public string Title { get; set; }
    public string Description { get; set; }
}
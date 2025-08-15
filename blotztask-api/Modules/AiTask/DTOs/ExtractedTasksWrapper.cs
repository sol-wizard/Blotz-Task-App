
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.AiTask.DTOs;

public class ExtractedTasksWrapper
{
    public List<ExtractedTaskGoalPlanner> Tasks { get; set; } = new();
    public string? Message { get; set; }
}
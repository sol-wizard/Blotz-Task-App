
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.GoalPlannerChat.Dtos;

public class ExtractedTasksWrapperDto
{
    public List<GoalPlannerExtractedTaskDto> Tasks { get; set; } = new();
    public string? Message { get; set; }
}
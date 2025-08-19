using BlotzTask.Modules.Labels.DTOs;

namespace BlotzTask.Shared.DTOs;

public class ExtractedTaskGoalPlanner
{
    public string Title { get; set; }

    public string Description { get; set; } = "";
    
    public string? EndTime { get; set; }
    
    public bool IsValidTask { get; set; }

    public LabelDto Label { get; set; }
}
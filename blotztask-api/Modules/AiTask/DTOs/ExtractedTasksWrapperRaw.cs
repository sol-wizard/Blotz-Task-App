using System.Text.Json.Serialization;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.AiTask.DTOs;

public class ExtractedTasksWrapperRaw
{
    [JsonPropertyName("message")]
    public string? Message { get; set; }
        
    [JsonPropertyName("tasks")]
    public List<ExtractedTaskGoalPlannerRaw> Tasks { get; set; } = new List<ExtractedTaskGoalPlannerRaw>();
}
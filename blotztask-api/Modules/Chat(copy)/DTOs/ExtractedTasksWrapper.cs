using System.Text.Json.Serialization;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.AIChat.DTOs;

public class ExtractedTasksWrapper
{
    [JsonPropertyName("message")]
    public string? Message { get; set; }
        
    [JsonPropertyName("tasks")]
    public List<GoalPlannerRawExtractedTask> Tasks { get; set; } = new List<GoalPlannerRawExtractedTask>();
}
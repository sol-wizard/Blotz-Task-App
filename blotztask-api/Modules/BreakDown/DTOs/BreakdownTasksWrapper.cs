using System.Text.Json.Serialization;

namespace BlotzTask.Modules.BreakDown.DTOs;

public class BreakdownTasksWrapper
{
    [JsonPropertyName("subtasks")]
    public List<SubTaskWrapper> Subtasks { get; set; } = new();

}
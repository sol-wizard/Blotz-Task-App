using System.Text.Json.Serialization;

namespace BlotzTask.Modules.BreakDown.DTOs;

public class GeneratedSubTaskList
{
    [JsonPropertyName("subtasks")]
    public List<GeneratedSubTask> Subtasks { get; set; } = new();

}
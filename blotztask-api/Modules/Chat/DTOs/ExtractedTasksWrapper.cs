using System.Text.Json.Serialization;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.Chat.DTOs;

public class ExtractedTasksWrapper
{
    [JsonPropertyName("message")]
    public string? Message { get; set; }
        
    [JsonPropertyName("tasks")]
    public List<ExtractedTask> Tasks { get; set; } = new List<ExtractedTask>();
}
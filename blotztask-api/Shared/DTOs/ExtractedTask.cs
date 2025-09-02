using System.Text.Json.Serialization;

namespace BlotzTask.Shared.DTOs;

public class ExtractedTask
{
    [JsonPropertyName("title")]
    public string Title { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";
    
    [JsonPropertyName("start_time")]
    public string? StartTime { get; set; }

    [JsonPropertyName("end_time")]
    public string? EndTime { get; set; }
}
using System.Text.Json.Serialization;

namespace BlotzTask.Shared.DTOs;

public class ExtractedTask
{
    [JsonPropertyName("title")]
    public string Title { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("due_date")]
    public string? EndTime { get; set; }
    
    [JsonPropertyName("isValidTask")]
    public bool IsValidTask { get; set; }

    [JsonPropertyName("label")]
    public string Label { get; set; }
}
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.BreakDown.DTOs;

public class SubTaskWrapper
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
    [JsonPropertyName("duration")]
    public string Duration { get; set; } = string.Empty;
    [JsonPropertyName("order")]
    public int Order { get; set; }
}
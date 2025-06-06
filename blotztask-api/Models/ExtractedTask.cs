namespace BlotzTask.Models;

using System.Text.Json.Serialization;

public class ExtractedTask
{
    [JsonPropertyName("title")]
    public string Title { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("due_date")]
    public string? DueDate { get; set; }
    
    [JsonPropertyName("isValidTask")]
    public bool IsValidTask { get; set; }

    [JsonPropertyName("label")]
    public string label { get; set; }
}
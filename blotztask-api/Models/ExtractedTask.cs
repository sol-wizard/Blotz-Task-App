namespace BlotzTask.Models;

using System.Text.Json.Serialization;

public class ExtractedTask
{
    [JsonPropertyName("title")]
    public string Title { get; set; }

    [JsonPropertyName("due_date")]
    public string? DueDate { get; set; }
}
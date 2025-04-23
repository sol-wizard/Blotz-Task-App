namespace BlotzTask.Models;

using System.Text.Json.Serialization;

public class ExtractedTaskDTO
{
    public string Title { get; set; }

    public string Description { get; set; } = "";

    [JsonPropertyName("due_date")]
    public string? DueDate { get; set; }
    
    public bool IsValidTask { get; set; }

    public LabelDTO Label { get; set; }
}
using System.Text.Json.Serialization;
using BlotzTask.Modules.Labels.DTOs;

namespace BlotzTask.Shared.DTOs;

public class ExtractedTaskDto
{
    public string Title { get; set; }

    public string Description { get; set; } = "";

    [JsonPropertyName("due_date")]
    public string? DueDate { get; set; }
    
    public bool IsValidTask { get; set; }

    public LabelDto Label { get; set; }
}
using System.ComponentModel;
using System.Text.Json.Serialization;
using BlotzTask.Modules.Labels.DTOs;

namespace BlotzTask.Modules.ChatTaskGenerator.DTOs;

/// <summary>
/// Represents a single extracted task from user input.
/// </summary>
public class ExtractedTask
{
    [JsonPropertyName("title")]
    [Description("A short, descriptive name for the task")]
    public string Title { get; set; }

    [JsonPropertyName("description")]
    [Description("A detailed description of the task. Leave empty if no clear description is provided or implied by the user.")]
    public string Description { get; set; } = "";
    
    [JsonPropertyName("start_time")]
    [Description("The start time for the task in ISO 8601 format (yyyy-MM-ddTHH:mm:ss). Set to null for floating tasks with no specific time. For single-time tasks, this should equal end_time.")]
    public string? StartTime { get; set; }

    [JsonPropertyName("end_time")]
    [Description("The end time for the task in ISO 8601 format (yyyy-MM-ddTHH:mm:ss). Set to null for floating tasks with no specific time. For single-time tasks, this should equal start_time. For range tasks, this must be greater than start_time.")]
    public string? EndTime { get; set; }
    
    [JsonPropertyName("task_label")]
    [Description("The label or category for the task. Can be null if no label is specified or implied.")]
    public string?  TaskLabel { get; set; }
}
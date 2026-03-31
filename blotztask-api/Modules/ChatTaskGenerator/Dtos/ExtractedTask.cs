using System.ComponentModel;
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.ChatTaskGenerator.DTOs;

/// <summary>
///     Represents a single extracted task from user input.
/// </summary>
public class ExtractedTask
{
    [JsonPropertyName("title")]
    [Description("A short, descriptive name for the task")]
    public string Title { get; set; }

    [JsonPropertyName("description")]
    [Description(
        "A detailed description of the task. Leave empty if no clear description is provided or implied by the user.")]
    public string Description { get; set; } = "";

    [JsonPropertyName("start_time")]
    [Description(
        "The start time for the task as a local time in the format yyyy-MM-ddTHH:mm:ss. Do not include any timezone offset or Z suffix. For single-time tasks, this should equal end_time.")]
    public DateTime StartTime { get; set; }

    [JsonPropertyName("end_time")]
    [Description(
        "The end time for the task as a local time in the format yyyy-MM-ddTHH:mm:ss. Do not include any timezone offset or Z suffix. For single-time tasks, this should equal start_time. For range tasks, this must be greater than start_time.")]
    public DateTime EndTime { get; set; }

    [JsonPropertyName("task_label")]
    [Description("The label for the task.")]
    public LabelNameEnum LabelName { get; set; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum LabelNameEnum
{
    Work,
    Life,
    Learning,
    Health
}
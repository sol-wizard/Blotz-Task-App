using System.ComponentModel;
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.TimeEstimate.DTOs;

public class AITimeEstimation
{
    [JsonPropertyName("duration")]
    [Description("The estimated time duration for the task.")]
    public TimeSpan Duration { get; set; }
}
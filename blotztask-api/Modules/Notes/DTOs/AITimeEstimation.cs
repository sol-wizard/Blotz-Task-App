using System.ComponentModel;
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.Notes.DTOs;

public class AITimeEstimation
{
    [JsonPropertyName("duration")]
    [Description("The estimated time duration for the note.")]
    public TimeSpan Duration { get; set; }
}
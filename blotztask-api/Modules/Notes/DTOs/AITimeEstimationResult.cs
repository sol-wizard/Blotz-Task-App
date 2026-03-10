using System.ComponentModel;
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.Notes.DTOs;

public class AITimeEstimationResult
{
    [JsonPropertyName("duration")]
    [Description("The estimated time duration for the note.")]
    public TimeSpan Duration { get; set; }

    [JsonPropertyName("isSuccess")]
    [Description(
        "Indicates whether time estimation was successful. True if the note time can be estimated, false otherwise.")]
    public bool IsSuccess { get; set; }

    [JsonPropertyName("errorMessage")]
    [Description(
        "Error message explaining why time estimation failed. Empty string when isSuccess is true. Should be a brief, user-friendly explanation when isSuccess is false.")]
    public string ErrorMessage { get; set; } = "";
}
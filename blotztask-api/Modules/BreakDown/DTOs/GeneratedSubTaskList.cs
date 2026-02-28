using System.ComponentModel;
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.BreakDown.DTOs;

public class GeneratedSubTaskList
{
    [JsonPropertyName("subtasks")] public List<GeneratedSubTask> Subtasks { get; set; } = new();

    [JsonPropertyName("isSuccess")]
    [Description(
        "Indicates whether breakdown was successful. True if at least one subtask was extracted, false otherwise.")]
    public bool IsSuccess { get; set; }

    [JsonPropertyName("errorMessage")]
    [Description(
        "Error message explaining why task breakdown failed. Empty string when isSuccess is true. Should be a brief, user-friendly explanation when isSuccess is false.")]
    public string ErrorMessage { get; set; } = "";
}
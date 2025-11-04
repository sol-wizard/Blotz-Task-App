using System.ComponentModel;
using System.Text.Json.Serialization;
using BlotzTask.Modules.ChatTaskGenerator.DTOs;

namespace BlotzTask.Modules.ChatTaskGenerator.Dtos;

/// <summary>
/// Response message from the AI task generation service.
/// Contains extracted tasks and operation status.
/// </summary>
public class AiGenerateMessage
{
    [JsonPropertyName("isSuccess")]
    [Description("Indicates whether task extraction was successful. True if at least one actionable task was extracted, false otherwise.")]
    public bool IsSuccess { get; set; }

    [JsonPropertyName("extractedTasks")] 
    [Description("Array of tasks extracted from user input. Must contain at least one task when isSuccess is true. Empty array when isSuccess is false.")]
    public List<ExtractedTask> ExtractedTasks { get; set; } = new();

    [JsonPropertyName("errorMessage")]
    [Description("Error message explaining why task extraction failed. Empty string when isSuccess is true. Should be a brief, user-friendly explanation when isSuccess is false.")]
    public string ErrorMessage { get; set; } = "";
}
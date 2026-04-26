using System.ComponentModel;
using System.Text.Json.Serialization;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;

namespace BlotzTask.Modules.ChatTaskGenerator.Dtos;

/// <summary>
/// Response message from the AI task generation service.
/// Contains extracted tasks and operation status.
/// </summary>
public class AiGenerateMessage
{
    [JsonPropertyName("isSuccess")]
    [Description("Indicates whether extraction was successful. True if at least one task or one note was extracted, false otherwise.")]
    public bool IsSuccess { get; set; }

    [JsonPropertyName("userInput")]
    public string UserInput { get; set; } = "";

    [JsonPropertyName("extractedTasks")]
    [Description("Array of tasks extracted from user input (items with date/time). Empty when none have time.")]
    public List<ExtractedTask> ExtractedTasks { get; set; } = new();

    [JsonPropertyName("extractedNotes")]
    [Description("Array of notes extracted from user input (items with no date/time). Empty when all have time.")]
    public List<ExtractedNote> ExtractedNotes { get; set; } = new();

    [JsonPropertyName("errorCode")]
    [Description("Machine-readable error code identifying the failure type. Empty string when isSuccess is true.")]
    public string ErrorCode { get; set; } = "";

    [JsonPropertyName("errorMessage")]
    [Description("Error message explaining why task extraction failed. Empty string when isSuccess is true.")]
    public string ErrorMessage { get; set; } = "";

    [JsonPropertyName("inputTokens")]
    [Description("Number of prompt tokens used.")]
    public int InputTokens{ get; set; }

    [JsonPropertyName("outputTokens")]
    [Description("Number of completion tokens used.")]
    public int OutputTokens { get; set; }

    [JsonPropertyName("totalTokens")]
    [Description("Number of total tokens used.")]
    public int TotalTokens { get; set; }
}
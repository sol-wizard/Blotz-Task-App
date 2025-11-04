using System.Text.Json.Serialization;
using BlotzTask.Modules.ChatTaskGenerator.DTOs;

namespace BlotzTask.Modules.ChatTaskGenerator.Dtos;

public class AiGenerateMessage
{
    [JsonPropertyName("isSuccess")] public bool IsSuccess { get; set; }

    [JsonPropertyName("extractedTasks")] public List<ExtractedTask> ExtractedTasks { get; set; } = new();

    [JsonPropertyName("errorMessage")] public string ErrorMessage { get; set; } = "";
}
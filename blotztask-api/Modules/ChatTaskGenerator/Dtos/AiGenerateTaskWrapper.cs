using System.Text.Json.Serialization;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.ChatTaskGenerator.Dtos;

public class AiGenerateTaskWrapper
{
    [JsonPropertyName("isSuccess")] public bool IsSuccess { get; set; }

    [JsonPropertyName("tasks")] public List<ExtractedTask> ExtractedTasks { get; set; } = new();

    [JsonPropertyName("errorMessage")] public string ErrorMessage { get; set; } = "";
}
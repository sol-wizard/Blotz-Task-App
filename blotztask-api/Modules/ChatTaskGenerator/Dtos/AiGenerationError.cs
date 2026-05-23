using System.Text.Json.Serialization;

namespace BlotzTask.Modules.ChatTaskGenerator.Dtos;

public class AiGenerationError
{
    [JsonPropertyName("errorCode")]
    public string ErrorCode { get; set; } = "";

    [JsonPropertyName("errorMessage")]
    public string ErrorMessage { get; set; } = "";
}

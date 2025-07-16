using System.Text.Json.Serialization;

namespace BlotzTask.Modules.Chat.DTOs;

public class ConfidenceScoreWrapper
{

    [JsonPropertyName("confidenceScore")]
    public double ConfidenceScore { get; set; }
}
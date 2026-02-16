using System.Text.Json.Serialization;

namespace BlotzTask.Modules.SpeechToText.Dtos;

public sealed class FastTranscriptionResponse
{
    [JsonPropertyName("combinedPhrases")]
    public List<FastTranscriptionFullText>? CombinedPhrases { get; set; }
}

public sealed class FastTranscriptionFullText
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

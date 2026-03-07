// response dto
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.SpeechToText.Dtos;

public class SpeechTranscribeResponse
{
    [JsonPropertyName("combinedPhrases")]
    public List<SpeechCombinedPhrase> CombinedPhrases { get; set; } = new();
    
}

public class SpeechCombinedPhrase
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}
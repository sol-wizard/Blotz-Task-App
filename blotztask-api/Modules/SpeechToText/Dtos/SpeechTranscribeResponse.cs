using System.Text.Json.Serialization;

namespace BlotzTask.Modules.SpeechToText.Dtos;

public class SpeechTranscribeResponse
{
    [JsonPropertyName("durationMilliseconds")]
    public int DurationMilliseconds { get; set; }

    [JsonPropertyName("combinedPhrases")]
    public List<SpeechCombinedPhrase> CombinedPhrases { get; set; } = new();

    [JsonPropertyName("phrases")]
    public List<SpeechPhrase> Phrases { get; set; } = new();
}

public class SpeechCombinedPhrase
{
    [JsonPropertyName("channel")]
    public int? Channel { get; set; }

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

public class SpeechPhrase
{
    [JsonPropertyName("channel")]
    public int? Channel { get; set; }

    [JsonPropertyName("confidence")]
    public float? Confidence { get; set; }

    [JsonPropertyName("durationMilliseconds")]
    public int DurationMilliseconds { get; set; }

    [JsonPropertyName("offsetMilliseconds")]
    public int OffsetMilliseconds { get; set; }

    [JsonPropertyName("locale")]
    public string? Locale { get; set; }

    [JsonPropertyName("speaker")]
    public int? Speaker { get; set; }

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    [JsonPropertyName("words")]
    public List<SpeechWord> Words { get; set; } = new();
}

public class SpeechWord
{
    [JsonPropertyName("durationMilliseconds")]
    public int DurationMilliseconds { get; set; }

    [JsonPropertyName("offsetMilliseconds")]
    public int OffsetMilliseconds { get; set; }

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

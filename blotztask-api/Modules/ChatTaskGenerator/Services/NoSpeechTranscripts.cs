namespace BlotzTask.Modules.ChatTaskGenerator.Services;

/// <summary>
/// Text Whisper returns for audio with no speech ("Thank you.", "谢谢大家", like-and-subscribe
/// pleas from its subtitle training data). Groq's turbo model gives no_speech_prob = 0 for
/// silence, so the text itself is the only signal.
/// </summary>
public static class NoSpeechTranscripts
{
    // Compared after Normalize().
    private static readonly HashSet<string> ExactPhrases = new(StringComparer.Ordinal)
    {
        "thankyou",
        "thanks",
        "thankyouforwatching",
        "thanksforwatching",
        "thankyousomuch",
        "thankyouverymuch",
        "you",
        "bye",
        "谢谢",
        "谢谢大家",
        "谢谢观看",
        "谢谢收看",
        "感谢观看",
        "感谢收看",
        "多谢",
    };

    // Wording drifts; match the stable part. Also normalised.
    private static readonly string[] Markers =
    [
        "明镜与点点", // "请不吝点赞 订阅 转发 打赏支持明镜与点点栏目"
        "amaraorg",   // "字幕由 Amara.org 社区提供"
    ];

    public static bool Matches(string transcript)
    {
        var normalized = Normalize(transcript);

        return normalized.Length == 0
               || ExactPhrases.Contains(normalized)
               || Markers.Any(normalized.Contains);
    }

    // Letters and digits only, lower-cased.
    private static string Normalize(string text) =>
        string.Concat(text.Where(char.IsLetterOrDigit)).ToLowerInvariant();
}

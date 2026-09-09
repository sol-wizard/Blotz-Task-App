using BlotzTask.Shared.Exceptions;
using OpenAI.Audio;
using System.ClientModel;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public class SpeechTranscriptionService(AudioClient audioClient, ILogger<SpeechTranscriptionService> logger)
{
    // Whisper was trained on subtitled video, so audio with no speech in it comes back as the
    // captions that sat under silent footage: "Thank you.", "谢谢大家", a channel's like-and-subscribe
    // plea. Groq's whisper-large-v3-turbo reports no_speech_prob = 0 for pure silence, so these
    // phrases are the only server-side signal. The app meters the mic first; this is the backstop.
    // Compared after stripping everything but letters and digits, case-insensitively.
    private static readonly HashSet<string> NoSpeechTranscripts = new(StringComparer.OrdinalIgnoreCase)
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

    // Longer boilerplate varies in wording, so match on the part that never changes.
    private static readonly string[] NoSpeechMarkers =
    [
        "明镜与点点",      // "请不吝点赞 订阅 转发 打赏支持明镜与点点栏目"
        "amara.org",       // "字幕由 Amara.org 社区提供"
    ];

    public async Task<string> TranscribeAsync(IFormFile audio, CancellationToken ct = default)
    {
        if (audio.Length <= 0)
            throw new ArgumentException("Audio file cannot be empty.", nameof(audio));

        var transcript = await RequestTranscriptAsync(audio, ct);

        if (IsNoSpeechTranscript(transcript))
        {
            logger.LogInformation("Transcript matched a known no-speech phrase; treating as empty audio. Transcript: {Transcript}",
                transcript);
            throw new AiTaskGenerationException(AiErrorCode.EmptyAudio, "No speech was detected in the audio.");
        }

        return transcript;
    }

    /// <summary>
    /// True when the transcript is one of the phrases Whisper produces for audio that holds no speech.
    /// </summary>
    public static bool IsNoSpeechTranscript(string transcript)
    {
        var normalized = new string(transcript.Where(char.IsLetterOrDigit).ToArray());

        if (normalized.Length == 0)
            return true;

        if (NoSpeechTranscripts.Contains(normalized))
            return true;

        var lowered = transcript.ToLowerInvariant();
        return NoSpeechMarkers.Any(marker => lowered.Contains(marker, StringComparison.OrdinalIgnoreCase));
    }

    private async Task<string> RequestTranscriptAsync(IFormFile audio, CancellationToken ct)
    {
        try
        {
            await using var stream = audio.OpenReadStream();

            var result = await audioClient.TranscribeAudioAsync(
                stream,
                audio.FileName,
                new AudioTranscriptionOptions
                {
                    ResponseFormat = AudioTranscriptionFormat.Text
                },
                ct
            );

            var transcriptionResult = result.Value.Text;

            if (string.IsNullOrWhiteSpace(transcriptionResult))
                throw new InvalidOperationException("Transcription returned empty text.");

            return transcriptionResult.Trim();
        }
        catch (ClientResultException ex)
        {
            logger.LogWarning(ex,
                "Groq transcription request failed. Status: {Status}, Message: {Message}",
                ex.Status, ex.Message);
            throw new AiTranscriptionException("Groq transcription request failed.", ex);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Whisper transcription failed. ExceptionType: {ExceptionType}, Message: {Message}",
                ex.GetType().FullName, ex.Message);
            throw new AiTranscriptionException("Whisper transcription failed unexpectedly.", ex);
        }
    }
}

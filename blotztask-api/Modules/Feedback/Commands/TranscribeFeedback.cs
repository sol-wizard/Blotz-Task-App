using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.Feedback.Commands;

public class TranscribeFeedbackResponse
{
    public required string Text { get; init; }
}

// Speech to text only: no task generation and no AI quota, and the audio is never stored.
public class TranscribeFeedbackCommandHandler(
    SpeechTranscriptionService speechTranscriptionService,
    ILogger<TranscribeFeedbackCommandHandler> logger)
{
    private const long MaxAudioBytes = 10 * 1024 * 1024; // A hold-to-talk m4a is far smaller; Groq allows 25 MB

    public async Task<TranscribeFeedbackResponse> Handle(IFormFile audio, CancellationToken ct = default)
    {
        ValidateAudio(audio);

        try
        {
            var text = await speechTranscriptionService.TranscribeAsync(audio, ct);
            logger.LogInformation("Feedback audio transcribed, length={Length}", text.Length);
            return new TranscribeFeedbackResponse { Text = text };
        }
        catch (AiTaskGenerationException ex) when (ex.Code == AiErrorCode.EmptyAudio)
        {
            // A 400 lets the app say "no speech heard" instead of a generic failure.
            throw new ArgumentException("No speech was detected in the audio.", ex);
        }
    }

    private static void ValidateAudio(IFormFile audio)
    {
        if (audio.Length <= 0)
            throw new ArgumentException("Audio file cannot be empty.");

        if (audio.Length > MaxAudioBytes)
            throw new ArgumentException($"Audio exceeds the {MaxAudioBytes / 1024 / 1024} MB limit.");

        if (!audio.ContentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException($"Unsupported audio type '{audio.ContentType}'.");
    }
}

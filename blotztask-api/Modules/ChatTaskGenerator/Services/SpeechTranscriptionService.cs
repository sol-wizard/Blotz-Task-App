using BlotzTask.Shared.Speech;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public class SpeechTranscriptionService(AudioTranscriptionService transcription)
{
    public Task<string> TranscribeAsync(IFormFile audio, CancellationToken ct = default) =>
        transcription.TranscribeAsync(audio, ct);
}

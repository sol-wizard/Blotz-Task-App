using System.ClientModel;
using BlotzTask.Shared.Exceptions;
using OpenAI.Audio;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

public class TranscriptionResultDto
{
    public required string Text { get; init; }
}

/// <summary>
/// Speech-to-text for the AI Coach chat input (voice added on Ben's approval, superseding the
/// brief's text-only scope). Deliberately does NOT depend on the frozen ChatTaskGenerator
/// module — it uses the globally registered Groq Whisper <see cref="AudioClient"/> directly,
/// same pattern as the old SpeechTranscriptionService. The transcript only fills the client's
/// input box; sending it to the model stays an explicit user action.
/// </summary>
public class TranscribeAudioCommandHandler(
    AudioClient audioClient,
    ILogger<TranscribeAudioCommandHandler> logger)
{
    public async Task<TranscriptionResultDto> Handle(IFormFile audio, CancellationToken ct = default)
    {
        if (audio.Length <= 0)
            throw new ArgumentException("Audio file cannot be empty.", nameof(audio));

        try
        {
            await using var stream = audio.OpenReadStream();

            var result = await audioClient.TranscribeAudioAsync(
                stream,
                audio.FileName,
                new AudioTranscriptionOptions
                {
                    ResponseFormat = AudioTranscriptionFormat.Text,
                },
                ct);

            var text = result.Value.Text;
            if (string.IsNullOrWhiteSpace(text))
                throw new AiTranscriptionException("Transcription returned empty text.");

            return new TranscriptionResultDto { Text = text.Trim() };
        }
        catch (ClientResultException ex)
        {
            logger.LogWarning(ex,
                "Groq transcription request failed for AI Coach. Status: {Status}", ex.Status);
            throw new AiTranscriptionException("Transcription request failed.", ex);
        }
    }
}

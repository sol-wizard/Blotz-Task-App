using BlotzTask.Shared.Exceptions;
using OpenAI.Audio;
using System.ClientModel;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public class SpeechTranscriptionService(AudioClient audioClient, ILogger<SpeechTranscriptionService> logger)
{
    // Whisper picks the script for Mandarin on its own and, with no steer, often writes Traditional
    // characters for Simplified-Chinese speakers (about 1 in 7 Chinese voice inputs in PostHog).
    // A short prompt in the target script fixes the choice. Bilingual so English audio is unaffected —
    // this is a style hint only; language is still auto-detected, so no Language option is set.
    private const string TranscriptionPrompt =
        "以下是普通话的句子。The following is in English or Simplified Chinese.";

    public async Task<string> TranscribeAsync(IFormFile audio, CancellationToken ct = default)
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
                    Prompt = TranscriptionPrompt
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

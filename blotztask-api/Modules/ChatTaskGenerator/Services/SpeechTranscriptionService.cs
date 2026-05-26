using System.Diagnostics;
using Azure;
using BlotzTask.Shared.Exceptions;
using OpenAI.Audio;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public class SpeechTranscriptionService(AudioClient audioClient, ILogger<SpeechTranscriptionService> logger)
{
    public async Task<string> TranscribeAsync(IFormFile audio, CancellationToken ct = default)
    {
        if (audio.Length <= 0)
            throw new ArgumentException("Audio file cannot be empty.", nameof(audio));

        var stopwatch = Stopwatch.StartNew();

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

            stopwatch.Stop();
            logger.LogInformation(
                "Whisper transcription completed in {ElapsedMilliseconds}ms. TranscriptionText: {TranscriptionText}",
                stopwatch.ElapsedMilliseconds, transcriptionResult.Trim());

            return transcriptionResult.Trim();
        }
        catch (RequestFailedException ex)
        {
            logger.LogWarning(ex,
                "Whisper API request failed.");
            throw new AiTranscriptionException("Whisper API request failed.", ex);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Whisper transcription failed.");
            throw new AiTranscriptionException("Whisper transcription failed unexpectedly.", ex);
        }
    }
}

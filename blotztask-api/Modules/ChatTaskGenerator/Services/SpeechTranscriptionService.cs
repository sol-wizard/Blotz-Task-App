using Azure;
using BlotzTask.Modules.ChatTaskGenerator.Clients;
using BlotzTask.Shared.Exceptions;
using OpenAI.Audio;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public class SpeechTranscriptionService(TranscriptClient transcriptClient, ILogger<SpeechTranscriptionService> logger)
{
    private readonly AudioClient _audioClient = transcriptClient.GetAudioClient();
    

    public async Task<string> TranscribeAsync(IFormFile audio, CancellationToken ct = default)
    {
        if (audio.Length <= 0)
            throw new ArgumentException("Audio file cannot be empty.", nameof(audio));

        try
        {
            await using var stream = audio.OpenReadStream();

            var result = await _audioClient.TranscribeAudioAsync(
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
        catch (RequestFailedException ex)
        {
            logger.LogError(ex,
                "Whisper API request failed. Status: {Status}, ErrorCode: {ErrorCode}",
                ex.Status, ex.ErrorCode);
            throw new AiTranscriptionException("Whisper API request failed.", ex);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Whisper transcription failed. ExceptionType: {ExceptionType}, Message: {Message}",
                ex.GetType().FullName, ex.Message);
            throw new AiTranscriptionException("Whisper transcription failed unexpectedly.", ex);
        }
    }
}

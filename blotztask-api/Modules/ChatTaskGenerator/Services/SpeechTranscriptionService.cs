using Azure;
using Azure.AI.OpenAI;
using BlotzTask.Shared.Exceptions;
using OpenAI.Audio;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public class SpeechTranscriptionService
{
    private readonly AudioClient _audioClient;
    private readonly ILogger<SpeechTranscriptionService> _logger;

    public SpeechTranscriptionService(IConfiguration configuration, ILogger<SpeechTranscriptionService> logger)
    {
        _logger = logger;

        var endpoint = configuration["AzureOpenAI:Endpoint"];
        var apiKey = configuration["AzureOpenAI:ApiKey"];
        var deploymentId = configuration["AzureOpenAI:AiModels:Speech:DeploymentId"];

        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException(
                "Missing Azure OpenAI configuration. Set AzureOpenAI:Endpoint and AzureOpenAI:ApiKey.");

        if (string.IsNullOrWhiteSpace(deploymentId))
            throw new InvalidOperationException(
                "Missing Whisper deployment. Set AzureOpenAI:AiModels:Speech:DeploymentId.");

        var client = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
        _audioClient = client.GetAudioClient(deploymentId);
    }

    public async Task<string> TranscribeAsync(IFormFile audio, CancellationToken ct = default)
    {
        if (audio.Length <= 0)
            throw new ArgumentException("Audio file cannot be empty.", nameof(audio));

        _logger.LogInformation(
            "Starting Whisper transcription. FileName: {FileName}, ContentType: {ContentType}, SizeBytes: {SizeBytes}",
            audio.FileName, audio.ContentType, audio.Length);

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

            _logger.LogInformation("Whisper transcription completed. Characters: {Length}", transcriptionResult.Length);

            return transcriptionResult.Trim();
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex,
                "Whisper API request failed. Status: {Status}, ErrorCode: {ErrorCode}",
                ex.Status, ex.ErrorCode);
            throw new AiTranscriptionException("Whisper API request failed.", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Whisper transcription failed. ExceptionType: {ExceptionType}, Message: {Message}",
                ex.GetType().FullName, ex.Message);
            throw new AiTranscriptionException("Whisper transcription failed unexpectedly.", ex);
        }
    }
}
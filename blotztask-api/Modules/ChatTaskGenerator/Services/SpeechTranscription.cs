using Azure;
using Azure.AI.OpenAI;
using OpenAI.Audio;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public class SpeechTranscription
{
    private readonly AudioClient _audioClient;
    private readonly ILogger<SpeechTranscription> _logger;

    public SpeechTranscription(IConfiguration configuration, ILogger<SpeechTranscription> logger)
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
                "Missing Whisper deployment. Set AzureOpenAI:AiModels:Whisper:DeploymentId.");

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

            _logger.LogInformation("Calling Azure OpenAI TranscribeAudioAsync...");

            var result = await _audioClient.TranscribeAudioAsync(
                stream,
                audio.FileName,
                new AudioTranscriptionOptions
                {
                    ResponseFormat = AudioTranscriptionFormat.Text
                },
                ct
            );

            _logger.LogInformation("TranscribeAudioAsync returned successfully.");

            var text = result.Value.Text;

            _logger.LogInformation("Raw transcription text: [{Text}]", text);

            if (string.IsNullOrWhiteSpace(text))
                throw new InvalidOperationException("Whisper transcription returned empty text.");

            _logger.LogInformation("Whisper transcription completed. Characters: {Length}", text.Length);
            Console.WriteLine($"speech text from whisper {text}");

            return text.Trim();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Whisper transcription failed. ExceptionType: {ExceptionType}, Message: {Message}, InnerException: {InnerMessage}",
                ex.GetType().FullName,
                ex.Message,
                ex.InnerException?.Message);
            throw;
        }
    }
}
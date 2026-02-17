using System.ComponentModel.DataAnnotations;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using BlotzTask.Modules.SpeechToText.Dtos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.SpeechToText.Services;

public class FastTranscriptionRequest
{
    [Required] public Guid UserId { get; set; }
    [Required] public string ConversationId { get; set; }
    [Required] public IFormFile WavFile { get; set; }
}

public interface IFastTranscriptionService
{
    Task<string> FastTranscribeWavAsync(FastTranscriptionRequest fastTranscriptionRequest,
        CancellationToken ct = default);
}

public sealed class FastTranscriptionService : IFastTranscriptionService
{
    private const string ApiVersion = "2025-10-15";
    private readonly HttpClient _http;
    private readonly ILogger<FastTranscriptionService> _logger;
    private readonly IChatMessageProcessor _processor;
    private readonly SpeechTokenSettings _settings;

    public FastTranscriptionService(HttpClient http, IOptions<SpeechTokenSettings> settings,
        IChatMessageProcessor processor, ILogger<FastTranscriptionService> logger)
    {
        _http = http;
        _settings = settings.Value;
        _processor = processor;
        _logger = logger;
    }

    public async Task<string> FastTranscribeWavAsync(FastTranscriptionRequest fastTranscriptionRequest,
        CancellationToken ct = default)
    {
        var wavFile = fastTranscriptionRequest.WavFile;
        if (wavFile == null || wavFile.Length == 0)
            throw new ArgumentException("WAV file is required.", nameof(wavFile));

        var endpoint =
            $"https://{_settings.Region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version={ApiVersion}";

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Headers.Add("Ocp-Apim-Subscription-Key", _settings.Key);

        await using var fileStream = wavFile.OpenReadStream();
        using var audioContent = new StreamContent(fileStream);
        audioContent.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");

        const string definitionJson = "{\"locales\":[]}";
        using var definitionContent = new StringContent(definitionJson, Encoding.UTF8, "application/json");

        using var form = new MultipartFormDataContent();
        form.Add(audioContent, "audio", string.IsNullOrWhiteSpace(wavFile.FileName) ? "audio.wav" : wavFile.FileName);
        form.Add(definitionContent, "definition");
        request.Content = form;

        using var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(
                $"Fast transcription request failed: {(int)response.StatusCode} {response.ReasonPhrase}. Body: {body}");

        var text = ExtractFullResult(body);
        if (string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException($"Transcription response did not contain text. Body: {body}");

        _logger.LogInformation("Transcription generated for conversation {ConversationId}", fastTranscriptionRequest.ConversationId);

        try
        {
            await _processor.ProcessUserTextAsync(fastTranscriptionRequest.UserId,
                fastTranscriptionRequest.ConversationId!,
                text, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to process transcription for user {UserId} and conversation {ConversationId}",
                fastTranscriptionRequest.UserId,
                fastTranscriptionRequest.ConversationId);
        }
        
        return text;
    }

    private static string? ExtractFullResult(string responseJson)
    {
        var response = JsonSerializer.Deserialize<FastTranscriptionResponse>(
            responseJson,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        var phraseTexts = response?.CombinedPhrases?
            .Select(p => p.Text?.Trim())
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .ToList();

        if (phraseTexts is { Count: > 0 })
            return string.Join(" ", phraseTexts!);

        return null;
    }
}

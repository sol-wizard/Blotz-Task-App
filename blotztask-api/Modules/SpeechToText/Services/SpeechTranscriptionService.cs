using System.Net.Http.Headers;
using System.Text.Json;
using BlotzTask.Modules.SpeechToText.Dtos;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;

namespace BlotzTask.Modules.SpeechToText.Services;

public sealed class SpeechTranscriptionService
{
    private readonly HttpClient _http;
    private readonly SpeechTokenSettings _settings;
    private readonly ILogger<SpeechTranscriptionService> _logger;

    public SpeechTranscriptionService(
        HttpClient http,
        IOptions<SpeechTokenSettings> settings,
        ILogger<SpeechTranscriptionService> logger)
    {
        _http = http;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<SpeechTranscribeResponse> TranscribeAsync(
        IFormFile audio,
        string? definition,
        CancellationToken ct = default)
    {
        if (audio.Length <= 0) throw new ArgumentException("Audio file cannot be empty.", nameof(audio));

        var endpoint = BuildTranscribeEndpoint();
        _logger.LogInformation(
            "Starting speech transcription. FileName: {FileName}, ContentType: {ContentType}, SizeBytes: {SizeBytes}, Endpoint: {Endpoint}",
            audio.FileName,
            audio.ContentType,
            audio.Length,
            endpoint);

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Headers.Add("Ocp-Apim-Subscription-Key", _settings.Key);

        using var formData = new MultipartFormDataContent();
        using var stream = audio.OpenReadStream();
        using var audioContent = new StreamContent(stream);
        var contentType = string.IsNullOrWhiteSpace(audio.ContentType) ? "application/octet-stream" : audio.ContentType;
        audioContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        formData.Add(audioContent, "audio", audio.FileName);

        if (!string.IsNullOrWhiteSpace(definition))
            formData.Add(new StringContent(definition), "definition");

        request.Content = formData;

        using var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Speech transcription failed. StatusCode: {StatusCode}, Reason: {ReasonPhrase}",
                (int)response.StatusCode,
                response.ReasonPhrase);
            throw new InvalidOperationException(
                $"Speech transcribe request failed: {(int)response.StatusCode} {response.ReasonPhrase}. Body: {body}");
        }

        var result = JsonSerializer.Deserialize<SpeechTranscribeResponse>(
            body,
            new JsonSerializerOptions(JsonSerializerDefaults.Web));

        _logger.LogInformation(
            "Speech transcription completed. DurationMs: {DurationMs}, CombinedPhraseCount: {CombinedPhraseCount}, PhraseCount: {PhraseCount}",
            result?.DurationMilliseconds,
            result?.CombinedPhrases?.Count ?? 0,
            result?.Phrases?.Count ?? 0);

        return result ?? throw new InvalidOperationException("Speech transcribe response is empty.");
    }

    private string BuildTranscribeEndpoint()
    {
        if (string.IsNullOrWhiteSpace(_settings.Key))
            throw new InvalidOperationException("AzureSpeech:Key is not configured.");

        var baseEndpoint = string.IsNullOrWhiteSpace(_settings.Endpoint)
            ? $"https://{_settings.Region}.api.cognitive.microsoft.com"
            : _settings.Endpoint.TrimEnd('/');

        var apiVersion = string.IsNullOrWhiteSpace(_settings.ApiVersion) ? "2025-10-15" : _settings.ApiVersion;
        return $"{baseEndpoint}/speechtotext/transcriptions:transcribe?api-version={Uri.EscapeDataString(apiVersion)}";
    }
}

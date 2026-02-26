// service
using System.Net.Http.Headers;
using System.Text.Json;
using BlotzTask.Modules.SpeechToText.Dtos;
using Microsoft.Extensions.Options;

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

    public async Task<String> TranscribeAsync(
        IFormFile audio,
        CancellationToken ct = default)
    {
        if (audio.Length <= 0) throw new ArgumentException("Audio file cannot be empty.", nameof(audio));

        var endpoint = $"https://{_settings.Region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version={_settings.ApiVersion}";
        
        _logger.LogInformation(
            "Starting speech transcription. FileName: {FileName}, ContentType: {ContentType}, SizeBytes: {SizeBytes}, Endpoint: {Endpoint}",
            audio.FileName,
            audio.ContentType,
            audio.Length,
            endpoint);

        // Build HTTP POST request and attaches an audio file as form-data
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Headers.Add("Ocp-Apim-Subscription-Key", _settings.Key);

        using var formData = new MultipartFormDataContent();
        using var stream = audio.OpenReadStream();
        using var audioContent = new StreamContent(stream);
        var contentType = string.IsNullOrWhiteSpace(audio.ContentType) ? "application/octet-stream" : audio.ContentType;
        audioContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        formData.Add(audioContent, "audio", audio.FileName);
        
        request.Content = formData;

        // Send the transcription request and return result
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
        var text = result.CombinedPhrases == null
            ? null
            : string.Join(" ",
                result.CombinedPhrases
                    .Select(v => v.Text)
                    .Where(text => !string.IsNullOrWhiteSpace(text))
            ).Trim();
    

        return text ?? throw new InvalidOperationException("Speech transcribe response is empty.");
    }
}

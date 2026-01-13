using System.Net.Http.Headers;
using BlotzTask.Modules.SpeechToText.Dtos;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

public sealed class SpeechTokenService
{
    private const string CacheKey = "azure-speech-token";
    private readonly IMemoryCache _cache;
    private readonly HttpClient _http;
    private readonly SpeechTokenSettings _settings;

    public SpeechTokenService(HttpClient http, IMemoryCache cache, IOptions<SpeechTokenSettings> settings)
    {
        _http = http;
        _cache = cache;
        _settings = settings.Value;
    }

    public async Task<string> GetTokenAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue<string>(CacheKey, out var token) && !string.IsNullOrWhiteSpace(token))
            return token;

        var request = new HttpRequestMessage(HttpMethod.Post,
            $"https://{_settings.Region}.api.cognitive.microsoft.com/sts/v1.0/issueToken");

        request.Headers.Add("Ocp-Apim-Subscription-Key", _settings.Key);
        request.Content = new StringContent(string.Empty);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

        using var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(
                $"Speech token request failed: {(int)response.StatusCode} {response.ReasonPhrase}. Body: {body}");

        token = body.Trim();
        if (string.IsNullOrWhiteSpace(token))
            throw new InvalidOperationException("Speech token is empty.");

        _cache.Set(CacheKey, token, TimeSpan.FromMinutes(9));

        return token;
    }
}
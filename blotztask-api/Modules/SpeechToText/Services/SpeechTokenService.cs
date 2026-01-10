using System.Net.Http.Headers;
using Microsoft.Extensions.Caching.Memory;

public sealed class SpeechTokenService
{
    private const string CacheKey = "azure-speech-token";
    private readonly IMemoryCache _cache;
    private readonly HttpClient _http;
    private readonly string _key;

    public SpeechTokenService(HttpClient http, IMemoryCache cache, IConfiguration config)
    {
        _http = http;
        _cache = cache;

        Region = config["AzureSpeech:Region"] ?? throw new InvalidOperationException("Missing AzureSpeech:Region");
        _key = config["AzureSpeech:Key"] ?? throw new InvalidOperationException("Missing AzureSpeech:Key");
    }

    public string Region { get; }

    public async Task<string> GetTokenAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue<string>(CacheKey, out var token) && !string.IsNullOrWhiteSpace(token))
            return token;

        var request = new HttpRequestMessage(HttpMethod.Post,
            $"https://{Region}.api.cognitive.microsoft.com/sts/v1.0/issueToken");

        request.Headers.Add("Ocp-Apim-Subscription-Key", _key);
        request.Content = new StringContent(string.Empty);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

        using var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            // 方便排查 401/403/429 等
            throw new InvalidOperationException(
                $"Speech token request failed: {(int)response.StatusCode} {response.ReasonPhrase}. Body: {body}");

        token = body.Trim();
        if (string.IsNullOrWhiteSpace(token))
            throw new InvalidOperationException("Speech token is empty.");

        // token 一般有效期 ~10 分钟，这里缓存 9 分钟更保险
        _cache.Set(CacheKey, token, TimeSpan.FromMinutes(9));

        return token;
    }
}
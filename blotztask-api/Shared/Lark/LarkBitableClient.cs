using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace BlotzTask.Shared.Lark;

public interface ILarkBitableClient
{
    Task<string> UploadImageAsync(Stream imageStream, string fileName, long fileSize, string baseToken, CancellationToken ct = default);
    Task CreateRecordAsync(string baseToken, string tableId, Dictionary<string, object> fields, CancellationToken ct = default);
}

public sealed class LarkBitableClient(
    HttpClient httpClient,
    ILarkTokenService tokenService,
    ILogger<LarkBitableClient> logger) : ILarkBitableClient
{
    private const string BaseUrl = "https://open.larksuite.com";

    // Uploads an image and returns its file_token.
    // parent_node = baseToken per Lark docs for bitable_image uploads.
    public async Task<string> UploadImageAsync(
        Stream imageStream,
        string fileName,
        long fileSize,
        string baseToken,
        CancellationToken ct = default)
    {
        var token = await tokenService.GetTenantAccessTokenAsync(ct);

        using var content = new MultipartFormDataContent();
        var fileContent = new StreamContent(imageStream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        content.Add(fileContent, "file", fileName);
        content.Add(new StringContent(fileName), "file_name");
        content.Add(new StringContent("bitable_image"), "parent_type");
        content.Add(new StringContent(baseToken), "parent_node");
        content.Add(new StringContent(fileSize.ToString()), "size");

        using var request = new HttpRequestMessage(HttpMethod.Post,
            $"{BaseUrl}/open-apis/drive/v1/medias/upload_all");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = content;

        var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        var code = body.GetProperty("code").GetInt32();
        if (code != 0)
        {
            logger.LogError("Lark image upload failed with code {Code}: {Msg}", code,
                body.GetProperty("msg").GetString());
            throw new InvalidOperationException($"Lark image upload failed (code {code})");
        }

        var fileToken = body.GetProperty("data").GetProperty("file_token").GetString()!;
        logger.LogInformation("Lark image uploaded, file_token {FileToken}", fileToken);
        return fileToken;
    }

    public async Task CreateRecordAsync(
        string baseToken,
        string tableId,
        Dictionary<string, object> fields,
        CancellationToken ct = default)
    {
        var token = await tokenService.GetTenantAccessTokenAsync(ct);

        var payload = JsonSerializer.Serialize(new { fields });
        using var request = new HttpRequestMessage(HttpMethod.Post,
            $"{BaseUrl}/open-apis/bitable/v1/apps/{baseToken}/tables/{tableId}/records");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        var code = body.GetProperty("code").GetInt32();
        if (code != 0)
        {
            logger.LogError("Lark record create failed with code {Code}: {Msg}", code,
                body.GetProperty("msg").GetString());
            throw new InvalidOperationException($"Lark record create failed (code {code})");
        }

        logger.LogInformation("Lark feedback record created in table {TableId}", tableId);
    }
}

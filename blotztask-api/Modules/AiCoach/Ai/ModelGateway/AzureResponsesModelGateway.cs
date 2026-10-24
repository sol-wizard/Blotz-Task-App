using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace BlotzTask.Modules.AiCoach.Ai.ModelGateway;

/// <summary>A turn-scoped, stateless Responses adapter. No response IDs or state are shared between turns.</summary>
public sealed class AzureResponsesModelGateway(HttpClient client, string endpoint, string apiKey,
    AiCoachModelProfile profile) : IModelGateway
{
    // Full output preserves reasoning items, message phases and provider tool IDs for tool continuation.
    private readonly Dictionary<string, JsonArray> _outputBeforeTool = [];
    public AiCoachModelProfile Profile => profile;
    public IModelGateway OpenTurn() => new AzureResponsesModelGateway(client, endpoint, apiKey, profile);

    public async Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
    {
        var input = new JsonArray();
        foreach (var message in request.Messages)
        {
            switch (message)
            {
                case GatewayUserMessage user:
                    input.Add(new JsonObject { ["role"] = "user", ["content"] = user.Content });
                    break;
                case GatewaySystemMessage system:
                    input.Add(new JsonObject { ["role"] = "system", ["content"] = system.Content });
                    break;
                case GatewayAssistantMessage assistant:
                    if (assistant.ToolCalls.Count > 0 && _outputBeforeTool.TryGetValue(assistant.ToolCalls[0].Id, out var saved))
                    {
                        foreach (var item in saved) input.Add(item!.DeepClone());
                        break;
                    }
                    if (!string.IsNullOrEmpty(assistant.Content))
                        input.Add(new JsonObject { ["role"] = "assistant", ["content"] = assistant.Content });
                    foreach (var call in assistant.ToolCalls)
                        input.Add(new JsonObject { ["type"] = "function_call", ["call_id"] = call.Id,
                            ["name"] = call.Name, ["arguments"] = call.ArgumentsJson });
                    break;
                case GatewayToolResultMessage tool:
                    input.Add(new JsonObject { ["type"] = "function_call_output", ["call_id"] = tool.ToolCallId,
                        ["output"] = tool.Content });
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported gateway message {message.GetType().Name}.");
            }
        }
        var tools = new JsonArray();
        foreach (var tool in request.Tools)
            tools.Add(new JsonObject { ["type"] = "function", ["name"] = tool.Name,
                ["description"] = tool.Description, ["strict"] = false,
                ["parameters"] = JsonNode.Parse(tool.ParametersJsonSchema) });
        var streaming = request.OnTextDelta is not null;
        var body = new JsonObject { ["model"] = profile.DeploymentId, ["instructions"] = request.SystemPrompt,
            ["input"] = input, ["tools"] = tools, ["store"] = false, ["stream"] = streaming,
            ["max_output_tokens"] = request.MaxOutputTokens ?? profile.MaxOutputTokens,
            ["include"] = new JsonArray("reasoning.encrypted_content") };
        if (profile.ReasoningEffort is { } effort)
            body["reasoning"] = new JsonObject { ["effort"] = effort };
        using var http = new HttpRequestMessage(HttpMethod.Post, endpoint.TrimEnd('/') + "/openai/v1/responses");
        http.Headers.Add("api-key", apiKey);
        http.Content = JsonContent.Create(body);
        using var response = await client.SendAsync(http, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        if (!response.IsSuccessStatusCode)
            // Provider bodies may echo user content; keep them out of application logs.
            throw new HttpRequestException($"Azure Responses returned HTTP {(int)response.StatusCode}.", null, response.StatusCode);
        using var document = streaming
            ? await ReadStreamAsync(response, request.OnTextDelta!, cancellationToken)
            : await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        return ParseCompletion(document.RootElement);
    }

    private ModelCompletionResult ParseCompletion(JsonElement root)
    {
        var status = root.GetProperty("status").GetString();
        if (status is not ("completed" or "incomplete"))
            throw new HttpRequestException($"Azure Responses ended with status '{status}'.");
        var calls = new List<ModelToolCallRequest>();
        var texts = new List<string>();
        var refused = false;
        foreach (var item in root.GetProperty("output").EnumerateArray())
        {
            switch (item.GetProperty("type").GetString())
            {
                case "function_call":
                    calls.Add(new(item.GetProperty("call_id").GetString()!, item.GetProperty("name").GetString()!,
                        item.GetProperty("arguments").GetString()!));
                    break;
                case "message":
                    foreach (var part in item.GetProperty("content").EnumerateArray())
                    {
                        if (part.GetProperty("type").GetString() == "output_text") texts.Add(part.GetProperty("text").GetString()!);
                        if (part.GetProperty("type").GetString() == "refusal") refused = true;
                    }
                    break;
            }
        }
        if (calls.Count > 0)
            _outputBeforeTool[calls[0].Id] = JsonNode.Parse(root.GetProperty("output").GetRawText())!.AsArray();
        var input = 0; var cached = 0; var output = 0; var total = 0;
        if (root.TryGetProperty("usage", out var usage) && usage.ValueKind == JsonValueKind.Object)
        {
            input = usage.GetProperty("input_tokens").GetInt32();
            output = usage.GetProperty("output_tokens").GetInt32();
            total = usage.GetProperty("total_tokens").GetInt32();
            if (usage.TryGetProperty("input_tokens_details", out var details)
                && details.TryGetProperty("cached_tokens", out var value)) cached = value.GetInt32();
        }
        var reason = root.TryGetProperty("incomplete_details", out var incomplete) && incomplete.ValueKind == JsonValueKind.Object
            && incomplete.TryGetProperty("reason", out var why) ? why.GetString() : null;
        var filtered = refused || reason == "content_filter" || HasBlockedContent(root);
        var finish = filtered ? ModelFinishReason.ContentFilter
            : status == "incomplete" ? reason == "max_output_tokens" ? ModelFinishReason.Length : ModelFinishReason.Other
            : calls.Count > 0 ? ModelFinishReason.ToolCalls : ModelFinishReason.Stop;
        return new(texts.Count == 0 ? null : string.Concat(texts), calls, finish, input, output, total, cached);
    }

    private static bool HasBlockedContent(JsonElement root) =>
        root.TryGetProperty("content_filters", out var filters) && filters.ValueKind == JsonValueKind.Array
        && filters.EnumerateArray().Any(filter => filter.TryGetProperty("blocked", out var blocked) && blocked.ValueKind == JsonValueKind.True);

    private static async Task<JsonDocument> ReadStreamAsync(HttpResponseMessage response, Func<string, Task> onText,
        CancellationToken ct)
    {
        using var reader = new StreamReader(await response.Content.ReadAsStreamAsync(ct));
        var data = new StringBuilder();
        JsonDocument? terminal = null;
        try
        {
            while (await reader.ReadLineAsync(ct) is { } line)
            {
                if (line.Length == 0)
                {
                    if (data.Length > 0) await HandleEvent();
                    continue;
                }
                if (line.StartsWith("data:", StringComparison.Ordinal))
                {
                    if (data.Length > 0) data.Append('\n');
                    data.Append(line.AsSpan(5).TrimStart());
                }
            }
            if (data.Length > 0) await HandleEvent();
            return terminal ?? throw new IOException("Azure Responses stream ended before a terminal response.");
        }
        catch { terminal?.Dispose(); throw; }

        async Task HandleEvent()
        {
            var payload = data.ToString(); data.Clear();
            if (payload == "[DONE]") return;
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;
            switch (root.GetProperty("type").GetString())
            {
                case "response.output_text.delta":
                    var delta = root.GetProperty("delta").GetString();
                    if (!string.IsNullOrEmpty(delta)) await onText(delta);
                    break;
                case "response.completed":
                case "response.incomplete":
                    terminal?.Dispose();
                    terminal = JsonDocument.Parse(root.GetProperty("response").GetRawText());
                    break;
                case "error":
                case "response.failed":
                    throw new HttpRequestException("Azure Responses streaming request failed.");
            }
        }
    }
}

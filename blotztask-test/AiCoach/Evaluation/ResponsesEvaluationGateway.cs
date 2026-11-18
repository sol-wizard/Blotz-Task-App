using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>Evaluation-only Responses adapter; production still uses its existing Azure gateway.</summary>
internal sealed class ResponsesEvaluationGateway(string endpoint, string key, string deployment) : IModelGateway
{
    private static readonly HttpClient Client = new() { Timeout = TimeSpan.FromSeconds(65) };
    private readonly Dictionary<string, JsonArray> _reasoningBeforeCall = [];

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
                    if (!string.IsNullOrEmpty(assistant.Content))
                        input.Add(new JsonObject { ["role"] = "assistant", ["content"] = assistant.Content });
                    for (var index = 0; index < assistant.ToolCalls.Count; index++)
                    {
                        var call = assistant.ToolCalls[index];
                        if (index == 0 && _reasoningBeforeCall.TryGetValue(call.Id, out var reasoning))
                            foreach (var item in reasoning) input.Add(item!.DeepClone());
                        input.Add(new JsonObject { ["type"] = "function_call", ["call_id"] = call.Id,
                            ["name"] = call.Name, ["arguments"] = call.ArgumentsJson });
                    }
                    break;
                case GatewayToolResultMessage tool:
                    input.Add(new JsonObject { ["type"] = "function_call_output", ["call_id"] = tool.ToolCallId,
                        ["output"] = tool.Content });
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported message {message.GetType().Name}");
            }
        }
        var tools = new JsonArray();
        foreach (var tool in request.Tools)
            tools.Add(new JsonObject { ["type"] = "function", ["name"] = tool.Name,
                ["description"] = tool.Description, ["strict"] = false,
                ["parameters"] = JsonNode.Parse(tool.ParametersJsonSchema) });
        var body = new JsonObject { ["model"] = deployment, ["instructions"] = request.SystemPrompt,
            ["input"] = input, ["tools"] = tools, ["max_output_tokens"] = request.MaxOutputTokens ?? 4096,
            ["store"] = false, ["include"] = new JsonArray("reasoning.encrypted_content") };
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post,
            endpoint.TrimEnd('/') + "/openai/v1/responses");
        httpRequest.Headers.Add("api-key", key);
        httpRequest.Content = JsonContent.Create(body);
        using var response = await Client.SendAsync(httpRequest, cancellationToken);
        var raw = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Responses HTTP {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        using var document = JsonDocument.Parse(raw);
        var root = document.RootElement;
        var calls = new List<ModelToolCallRequest>();
        var text = new List<string>();
        var pendingReasoning = new JsonArray();
        foreach (var item in root.GetProperty("output").EnumerateArray())
        {
            switch (item.GetProperty("type").GetString())
            {
                case "reasoning":
                    pendingReasoning.Add(JsonNode.Parse(item.GetRawText()));
                    break;
                case "function_call":
                    var id = item.GetProperty("call_id").GetString()!;
                    if (pendingReasoning.Count > 0)
                    {
                        _reasoningBeforeCall[id] = (JsonArray)pendingReasoning.DeepClone();
                        pendingReasoning.Clear();
                    }
                    calls.Add(new(id, item.GetProperty("name").GetString()!, item.GetProperty("arguments").GetString()!));
                    break;
                case "message":
                    foreach (var part in item.GetProperty("content").EnumerateArray())
                        if (part.GetProperty("type").GetString() == "output_text") text.Add(part.GetProperty("text").GetString()!);
                    break;
            }
        }
        var usage = root.GetProperty("usage");
        var inputTokens = usage.GetProperty("input_tokens").GetInt32();
        var outputTokens = usage.GetProperty("output_tokens").GetInt32();
        var cached = usage.TryGetProperty("input_tokens_details", out var details)
            && details.TryGetProperty("cached_tokens", out var cachedTokens) ? cachedTokens.GetInt32() : 0;
        var finish = root.GetProperty("status").GetString() == "incomplete" ? ModelFinishReason.Length
            : calls.Count > 0 ? ModelFinishReason.ToolCalls : ModelFinishReason.Stop;
        var reply = text.Count == 0 ? null : string.Join("", text);
        if (reply is not null && request.OnTextDelta is not null) await request.OnTextDelta(reply);
        return new(reply, calls, finish, inputTokens, outputTokens, inputTokens + outputTokens, cached);
    }
}

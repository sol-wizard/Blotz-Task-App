namespace BlotzTask.Modules.AiCoach.Ai.ModelGateway;

/// <summary>
/// Thin provider-neutral chat abstraction (tech design §21.11 / §25.8). The gateway maps the
/// semantic request onto the concrete vendor protocol; it never changes toolset permissions or
/// frame semantics. Everything above it (executor, dispatcher, kernel) is vendor-agnostic and
/// unit-testable with a fake gateway.
/// </summary>
public interface IModelGateway
{
    Task<ModelCompletionResult> CompleteAsync(
        ModelGatewayRequest request,
        CancellationToken cancellationToken);
}

public sealed record ModelGatewayRequest(
    string SystemPrompt,
    IReadOnlyList<GatewayMessage> Messages,
    IReadOnlyList<GatewayToolDefinition> Tools,
    ResponseFormatSpec? ResponseFormat = null);

/// <summary>
/// Vendor-neutral structured-output request (v3 tech design §10): the model must reply with a
/// single JSON document matching <paramref name="JsonSchema"/> (strict mode).
/// </summary>
public sealed record ResponseFormatSpec(string Name, string JsonSchema);

public sealed record GatewayToolDefinition(
    string Name,
    string Description,
    string ParametersJsonSchema);

public abstract record GatewayMessage;

public sealed record GatewaySystemMessage(string Content) : GatewayMessage;

public sealed record GatewayUserMessage(string Content) : GatewayMessage;

public sealed record GatewayAssistantMessage(
    string? Content,
    IReadOnlyList<ModelToolCallRequest> ToolCalls) : GatewayMessage;

public sealed record GatewayToolResultMessage(string ToolCallId, string Content) : GatewayMessage;

public sealed record ModelToolCallRequest(string Id, string Name, string ArgumentsJson);

public enum ModelFinishReason
{
    Stop = 0,
    ToolCalls = 1,
    ContentFilter = 2,
    Length = 3,
    Other = 4,
}

public sealed record ModelCompletionResult(
    string? AssistantText,
    IReadOnlyList<ModelToolCallRequest> ToolCalls,
    ModelFinishReason FinishReason,
    int InputTokens,
    int OutputTokens,
    int TotalTokens);

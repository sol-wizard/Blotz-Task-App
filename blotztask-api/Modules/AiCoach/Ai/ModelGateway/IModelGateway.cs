namespace BlotzTask.Modules.AiCoach.Ai.ModelGateway;

/// <summary>Provider adapter for natural replies and tool calls.</summary>
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
    int? MaxOutputTokens = null);

public sealed record GatewayToolDefinition(
    string Name,
    string Description,
    string ParametersJsonSchema);

public abstract record GatewayMessage;

public sealed record GatewayUserMessage(string Content) : GatewayMessage;

public sealed record GatewaySystemMessage(string Content) : GatewayMessage;

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

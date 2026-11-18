using System.Text.Json.Serialization;

namespace BlotzTask.Modules.AiCoach.Ai.ModelGateway;

/// <summary>Provider adapter for natural replies and tool calls.</summary>
public interface IModelGateway
{
    // Stateless adapters may reuse themselves. Responses adapters return an isolated turn session.
    IModelGateway OpenTurn() => this;
    // Opens a turn whose spend counts towards this user's AI Coach allowance.
    IModelGateway OpenTurn(Guid userId) => OpenTurn();
    AiCoachModelProfile? Profile => null;

    Task<ModelCompletionResult> CompleteAsync(
        ModelGatewayRequest request,
        CancellationToken cancellationToken);
}

public sealed record ModelGatewayRequest(
    string SystemPrompt,
    IReadOnlyList<GatewayMessage> Messages,
    IReadOnlyList<GatewayToolDefinition> Tools,
    int? MaxOutputTokens = null,
    Func<string, Task>? OnTextDelta = null,
    // Replaces the profile's reasoning effort for this call; ignored by profiles that do not reason.
    string? ReasoningEffort = null,
    // Called for each streamed piece of output (reply text or tool arguments), so the caller can tell a slow
    // call that is still writing from one that has stalled.
    Action? OnOutputProgress = null);

/// <summary>Limits for the coach's own background calls: context summaries and topic digests.</summary>
public static class BackgroundModelCall
{
    // Reasoning tokens count against max_output_tokens. At the profile's effort they used up the
    // whole limit of a short summary and the call was cut off, so these calls reason less.
    public const string ReasoningEffort = "low";
    // Room for that reasoning on top of the visible text the caller sized its limit for.
    public const int ReasoningTokens = 1024;

    public static int OutputTokens(int textTokens) => textTokens + ReasoningTokens;
}

public sealed record GatewayToolDefinition(
    string Name,
    string Description,
    string ParametersJsonSchema);

// Discriminators let persisted conversation history restore each message type.
[JsonPolymorphic(TypeDiscriminatorPropertyName = "$type")]
[JsonDerivedType(typeof(GatewayUserMessage), "user")]
[JsonDerivedType(typeof(GatewaySystemMessage), "system")]
[JsonDerivedType(typeof(GatewayAssistantMessage), "assistant")]
[JsonDerivedType(typeof(GatewayToolResultMessage), "tool")]
[JsonDerivedType(typeof(GatewayContextDataMessage), "context")]
public abstract record GatewayMessage;

public sealed record GatewayUserMessage(string Content) : GatewayMessage;

public sealed record GatewaySystemMessage(string Content) : GatewayMessage;

/// <summary>
/// App-supplied data that changes within a topic (the history summary, the previous topic's summary), sent in the
/// user role. On the Responses API a change to any system message before the first user message drops the whole
/// prompt-cache hit, including the unchanged prompt and tools; a user-role message keeps that prefix cached.
/// Its content must say it is data from the app, not the user's words.
/// </summary>
public sealed record GatewayContextDataMessage(string Content) : GatewayMessage;

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
    int TotalTokens,
    // Part of InputTokens served from the provider's prompt cache.
    int CachedInputTokens = 0);

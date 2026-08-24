using System.Collections.Concurrent;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>
/// Observability-only running token totals per conversation (tech design §27 observer role:
/// records metrics, never business state). Formal quota accounting stays in the AiUsage module;
/// this exists so a developer watching the console can see what a session costs as they use it.
/// In-memory like the v1 conversations themselves; entries are dropped with the conversation.
/// </summary>
public sealed class AiCoachUsageTracker
{
    private readonly ConcurrentDictionary<Guid, ConversationUsage> _byConversation = new();

    public ConversationUsage Add(Guid conversationId, int inputTokens, int outputTokens, int modelCalls)
    {
        return _byConversation.AddOrUpdate(
            conversationId,
            _ => new ConversationUsage(inputTokens, outputTokens, modelCalls, 1),
            (_, current) => new ConversationUsage(
                current.InputTokens + inputTokens,
                current.OutputTokens + outputTokens,
                current.ModelCalls + modelCalls,
                current.Turns + 1));
    }

    public ConversationUsage? Find(Guid conversationId) =>
        _byConversation.TryGetValue(conversationId, out var usage) ? usage : null;

    public void Forget(Guid conversationId) => _byConversation.TryRemove(conversationId, out _);
}

public sealed record ConversationUsage(long InputTokens, long OutputTokens, long ModelCalls, long Turns)
{
    public long TotalTokens => InputTokens + OutputTokens;

    /// <summary>USD estimate from per-million prices; null when prices are not configured.</summary>
    public decimal? EstimateUsd(decimal inputUsdPerMillion, decimal outputUsdPerMillion) =>
        inputUsdPerMillion <= 0 && outputUsdPerMillion <= 0
            ? null
            : (InputTokens * inputUsdPerMillion + OutputTokens * outputUsdPerMillion) / 1_000_000m;
}

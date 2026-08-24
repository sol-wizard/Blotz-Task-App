using BlotzTask.Modules.AiCoach.Application.Effects;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Rules;
using BlotzTask.Modules.AiCoach.Infrastructure;

namespace BlotzTask.Modules.AiCoach.Application.Orchestration;

public interface IConversationKernel
{
    /// <summary>
    /// Runs one full dispatch cycle: reduce the input event, apply + save ("transaction A"),
    /// execute requested effects outside the lock, then reduce each effect's result event
    /// ("transaction B") — the two-phase protocol of tech design §16.1 mapped onto the
    /// in-memory store. Returns the conversation after the cycle settles.
    /// </summary>
    Task<Conversation> DispatchAsync(
        Guid userId,
        Guid conversationId,
        int? expectedVersion,
        ConversationEvent input,
        CancellationToken ct);
}

/// <summary>Thrown when the conversation does not exist or belongs to another user (mapped to 404, §22.6).</summary>
public sealed class ConversationNotFoundException()
    : Exception("Conversation not found.");

/// <summary>Version conflict: the caller acted on a stale snapshot. Carries the latest one (§18).</summary>
public sealed class ConversationVersionConflictException(Conversation conversation)
    : Exception("Conversation version conflict.")
{
    public Conversation Conversation { get; } = conversation;
}

/// <summary>A reducer or guard rejected the input deterministically. Carries the latest conversation.</summary>
public sealed class ConversationRuleViolationException(RuleViolation violation, Conversation conversation)
    : Exception($"Rejected by conversation rules: {violation}.")
{
    public RuleViolation Violation { get; } = violation;
    public Conversation Conversation { get; } = conversation;
}

public sealed class ConversationKernel(
    IConversationStore store,
    IConversationReducer reducer,
    ModeDefinitionRegistry modeRegistry,
    IEnumerable<IConversationEffectHandler> effectHandlers,
    TimeProvider clock,
    ILogger<ConversationKernel> logger) : IConversationKernel
{
    /// <summary>Backstop against effect chains that never settle (v1 chains are length 1).</summary>
    private const int MaxEffectChainLength = 5;

    public async Task<Conversation> DispatchAsync(
        Guid userId,
        Guid conversationId,
        int? expectedVersion,
        ConversationEvent input,
        CancellationToken ct)
    {
        var (conversation, pendingEffects) =
            await ReduceAndCommitAsync(userId, conversationId, expectedVersion, input, ct);

        // Effects run outside the lock (a model call must never block other transitions), and
        // each result event goes through its own locked reduce+commit cycle.
        var chainLength = 0;
        var queue = new Queue<EffectExecutionContext>(pendingEffects);
        while (queue.TryDequeue(out var context))
        {
            if (++chainLength > MaxEffectChainLength)
            {
                logger.LogError(
                    "Effect chain exceeded {Max} for conversation {ConversationId} — stopping.",
                    MaxEffectChainLength, conversationId);
                break;
            }

            var handler = effectHandlers.FirstOrDefault(h => h.CanHandle(context.Request))
                          ?? throw new InvalidOperationException(
                              $"No effect handler for {context.Request.GetType().Name}.");

            ConversationEvent? resultEvent;
            try
            {
                resultEvent = await handler.ExecuteAsync(context, ct);
            }
            catch (Exception ex)
            {
                // Effect handlers are expected to convert failures into result events themselves;
                // anything escaping here is a system fault — fail the effect, keep the
                // conversation consistent.
                logger.LogError(ex, "Effect {EffectId} crashed for conversation {ConversationId}",
                    context.EffectId, conversationId);
                resultEvent = context.Request switch
                {
                    GenerateModelTurnEffectRequest => new ModelGenerationFailed(
                        context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.Unknown),
                    PersistDraftEffectRequest persist => new DraftPersistenceFailed(
                        context.EffectId, persist.ArtifactId, "TaskPersistenceFailed"),
                    _ => null,
                };
            }

            if (resultEvent is null)
                continue;

            var (updated, nextEffects) =
                await CommitEffectResultAsync(userId, conversationId, context, resultEvent, ct);
            conversation = updated;
            foreach (var next in nextEffects)
                queue.Enqueue(next);
        }

        return conversation;
    }

    /// <summary>"Transaction A": reduce the input event under the conversation lock and persist.</summary>
    private async Task<(Conversation, IReadOnlyList<EffectExecutionContext>)> ReduceAndCommitAsync(
        Guid userId,
        Guid conversationId,
        int? expectedVersion,
        ConversationEvent input,
        CancellationToken ct)
    {
        using var _ = await store.AcquireLockAsync(conversationId, ct);

        var conversation = await LoadOwnedAsync(userId, conversationId, ct);

        if (expectedVersion.HasValue && conversation.Version != expectedVersion.Value)
            throw new ConversationVersionConflictException(conversation);

        var contexts = ReduceApplySave(conversation, input, out var result);
        if (!result.IsAccepted)
            throw new ConversationRuleViolationException(result.Violation, conversation);

        await store.SaveAsync(conversation, ct);
        return (conversation, contexts);
    }

    /// <summary>"Transaction B": validate the effect is still awaited, reduce its result, persist.</summary>
    private async Task<(Conversation, IReadOnlyList<EffectExecutionContext>)> CommitEffectResultAsync(
        Guid userId,
        Guid conversationId,
        EffectExecutionContext context,
        ConversationEvent resultEvent,
        CancellationToken ct)
    {
        using var _ = await store.AcquireLockAsync(conversationId, ct);

        var conversation = await LoadOwnedAsync(userId, conversationId, ct);
        var now = clock.GetUtcNow();

        var effect = conversation.FindEffect(context.EffectId);
        if (effect is null || effect.Status is not (EffectStatus.Pending or EffectStatus.Running))
        {
            // Late or duplicate result — must not overwrite newer state (§17.4).
            logger.LogWarning("Dropping stale effect result {EffectId} for conversation {ConversationId}",
                context.EffectId, conversationId);
            return (conversation, []);
        }

        var contexts = ReduceApplySave(conversation, resultEvent, out var result);
        if (!result.IsAccepted)
        {
            effect.MarkSuperseded(now);
            await store.SaveAsync(conversation, ct);
            logger.LogWarning(
                "Effect result {EffectId} rejected by reducer ({Violation}) for conversation {ConversationId}",
                context.EffectId, result.Violation, conversationId);
            return (conversation, []);
        }

        var failed = resultEvent is ModelGenerationFailed or DraftPersistenceFailed;
        if (failed)
            effect.MarkFailed(now, resultEvent.GetType().Name);
        else
            effect.MarkCompleted(now);

        await store.SaveAsync(conversation, ct);
        return (conversation, contexts);
    }

    private List<EffectExecutionContext> ReduceApplySave(
        Conversation conversation,
        ConversationEvent input,
        out TransitionResult result)
    {
        var mode = modeRegistry.Get(conversation.Mode);
        var snapshot = conversation.ToSnapshot();
        result = reducer.Reduce(snapshot, input, mode);
        if (!result.IsAccepted)
            return [];

        var tracked = conversation.ApplyTransition(result, clock.GetUtcNow());

        // Capture everything effects need while still under the lock, so execution itself
        // runs lock-free on a consistent view.
        return tracked
            .Select(effect =>
            {
                effect.MarkRunning();
                return new EffectExecutionContext(
                    conversation.Id,
                    conversation.UserId,
                    effect.Id,
                    effect.BaseConversationVersion,
                    effect.Request,
                    conversation.ToSnapshot(),
                    conversation.Messages.ToList(),
                    conversation.TimeZoneId,
                    mode);
            })
            .ToList();
    }

    private async Task<Conversation> LoadOwnedAsync(Guid userId, Guid conversationId, CancellationToken ct)
    {
        var conversation = await store.FindAsync(conversationId, ct);
        // Ownership failures map to 404 to avoid resource enumeration (§22.6).
        if (conversation is null || conversation.UserId != userId)
            throw new ConversationNotFoundException();
        return conversation;
    }
}

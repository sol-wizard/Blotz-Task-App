using BlotzTask.Modules.AiCoach.Application.Effects;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Kernel;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;
using System.Diagnostics;
using System.Text.Json;

namespace BlotzTask.Modules.AiCoach.Application.Orchestration;

public interface IConversationApplication
{
    /// <summary>
    /// Runs one full dispatch cycle (v3 tech design §7): reduce the input event through the
    /// Kernel and commit under the conversation lock ("Transaction A"), execute requested
    /// effects outside the lock, then commit each effect's result event ("Transaction B").
    /// Returns the conversation after the cycle settles.
    /// </summary>
    Task<Conversation> DispatchAsync(
        Guid userId,
        Guid conversationId,
        int? expectedVersion,
        ConversationEvent input,
        CancellationToken ct);
}

/// <summary>Thrown when the conversation does not exist or belongs to another user (mapped to 404).</summary>
public sealed class ConversationNotFoundException()
    : Exception("Conversation not found.");

/// <summary>Version conflict: the caller acted on a stale snapshot. Carries the latest one.</summary>
public sealed class ConversationVersionConflictException(Conversation conversation)
    : Exception("Conversation version conflict.")
{
    public Conversation Conversation { get; } = conversation;
}

/// <summary>The Kernel rejected the input deterministically. Carries the latest conversation.</summary>
public sealed class ConversationRuleViolationException(TransitionRejection rejection, Conversation conversation)
    : Exception($"Rejected by conversation rules: {rejection}.")
{
    public TransitionRejection Rejection { get; } = rejection;
    public Conversation Conversation { get; } = conversation;
}

public sealed class ConversationApplication(
    IConversationStore store,
    IConversationKernel kernel,
    ModeDefinitionRegistry modeRegistry,
    IEnumerable<IConversationEffectHandler> effectHandlers,
    IOptions<AiCoachModuleOptions> options,
    TimeProvider clock,
    ILogger<ConversationApplication> logger) : IConversationApplication
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
        var dispatchStarted = Stopwatch.GetTimestamp();
        logger.LogInformation(
            "AiCoach.Dispatch.Started ConversationId={ConversationId} InputEvent={InputEvent} ExpectedVersion={ExpectedVersion} InputPayload={InputPayload}",
            conversationId,
            input.GetType().Name,
            expectedVersion,
            SerializeForLog(input));

        var (conversation, pendingEffects) =
            await ReduceAndCommitAsync(userId, conversationId, expectedVersion, input, ct);

        // Effects run outside the lock (a model call must never block other transitions), and
        // each result event goes through its own locked reduce+commit cycle.
        var chainLength = 0;
        var effectsExecuted = 0;
        var queue = new Queue<EffectExecutionContext>(pendingEffects);
        while (queue.TryDequeue(out var context))
        {
            if (++chainLength > MaxEffectChainLength)
            {
                logger.LogError(
                    "AiCoach.EffectChain.LimitExceeded ConversationId={ConversationId} MaxChainLength={MaxChainLength}",
                    conversationId,
                    MaxEffectChainLength);
                break;
            }
            effectsExecuted++;

            var handler = effectHandlers.FirstOrDefault(h => h.CanHandle(context.Request))
                          ?? throw new InvalidOperationException(
                              $"No effect handler for {context.Request.GetType().Name}.");

            ConversationEvent? resultEvent;
            var effectStarted = Stopwatch.GetTimestamp();
            logger.LogInformation(
                "AiCoach.Effect.Started ConversationId={ConversationId} EffectId={EffectId} EffectType={EffectType} BaseConversationVersion={BaseConversationVersion} ChainPosition={ChainPosition} EffectPayload={EffectPayload}",
                conversationId,
                context.EffectId,
                context.Request.GetType().Name,
                context.BaseConversationVersion,
                chainLength,
                SerializeForLog(context.Request));
            try
            {
                resultEvent = await handler.ExecuteAsync(context, ct);
            }
            catch (Exception ex)
            {
                // Effect handlers are expected to convert failures into result events themselves;
                // anything escaping here is a system fault — fail the effect, keep the
                // conversation consistent.
                logger.LogError(
                    ex,
                    "AiCoach.Effect.Crashed ConversationId={ConversationId} EffectId={EffectId} EffectType={EffectType} Result={Result} ExceptionType={ExceptionType} ExceptionMessage={ExceptionMessage} EffectPayload={EffectPayload}",
                    conversationId,
                    context.EffectId,
                    context.Request.GetType().Name,
                    "UnhandledException",
                    ex.GetType().Name,
                    ex.Message,
                    SerializeForLog(context.Request));
                resultEvent = context.Request switch
                {
                    GenerateModelTurnEffectRequest => new ModelTurnFailed(
                        context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.Unknown),
                    PersistProposalSetEffectRequest persist => new ProposalSetPersistenceFailed(
                        context.EffectId, persist.ProposalSetId, "TaskPersistenceFailed"),
                    _ => null,
                };
            }

            logger.LogInformation(
                "AiCoach.Effect.ExecutionCompleted ConversationId={ConversationId} EffectId={EffectId} EffectType={EffectType} ResultEvent={ResultEvent} HasResult={HasResult} ElapsedMs={ElapsedMs} ResultPayload={ResultPayload}",
                conversationId,
                context.EffectId,
                context.Request.GetType().Name,
                resultEvent?.GetType().Name,
                resultEvent is not null,
                Stopwatch.GetElapsedTime(effectStarted).TotalMilliseconds,
                SerializeForLog(resultEvent));

            if (resultEvent is null)
                continue;

            var (updated, nextEffects) =
                await CommitEffectResultAsync(userId, conversationId, context, resultEvent, ct);
            conversation = updated;
            foreach (var next in nextEffects)
                queue.Enqueue(next);
        }

        logger.LogInformation(
            "AiCoach.Dispatch.Completed ConversationId={ConversationId} InputEvent={InputEvent} ConversationVersion={ConversationVersion} Phase={Phase} GenerationStatus={GenerationStatus} EffectCount={EffectCount} ElapsedMs={ElapsedMs}",
            conversationId,
            input.GetType().Name,
            conversation.Version,
            conversation.Phase,
            conversation.GenerationStatus,
            effectsExecuted,
            Stopwatch.GetElapsedTime(dispatchStarted).TotalMilliseconds);

        return conversation;
    }

    /// <summary>Transaction A: reduce the input event under the conversation lock and persist.</summary>
    private async Task<(Conversation, IReadOnlyList<EffectExecutionContext>)> ReduceAndCommitAsync(
        Guid userId,
        Guid conversationId,
        int? expectedVersion,
        ConversationEvent input,
        CancellationToken ct)
    {
        var transactionStarted = Stopwatch.GetTimestamp();
        using var _ = await store.AcquireLockAsync(conversationId, ct);

        var conversation = await LoadOwnedAsync(userId, conversationId, ct);

        if (expectedVersion.HasValue && conversation.Version != expectedVersion.Value)
        {
            logger.LogWarning(
                "AiCoach.Transaction.VersionConflict ConversationId={ConversationId} Transaction={Transaction} InputEvent={InputEvent} ExpectedVersion={ExpectedVersion} ActualVersion={ActualVersion}",
                conversationId,
                "Input",
                input.GetType().Name,
                expectedVersion.Value,
                conversation.Version);
            throw new ConversationVersionConflictException(conversation);
        }

        var contexts = ReduceApplySave(conversation, input, out var transition);
        if (!transition.IsAccepted)
            throw new ConversationRuleViolationException(transition.Rejection, conversation);

        await store.SaveAsync(conversation, ct);
        logger.LogInformation(
            "AiCoach.Transaction.Committed ConversationId={ConversationId} Transaction={Transaction} InputEvent={InputEvent} ConversationVersion={ConversationVersion} EffectCount={EffectCount} ElapsedMs={ElapsedMs}",
            conversationId,
            "Input",
            input.GetType().Name,
            conversation.Version,
            contexts.Count,
            Stopwatch.GetElapsedTime(transactionStarted).TotalMilliseconds);
        return (conversation, contexts);
    }

    /// <summary>Transaction B: validate the effect is still awaited, reduce its result, persist (v3 §7.3).</summary>
    private async Task<(Conversation, IReadOnlyList<EffectExecutionContext>)> CommitEffectResultAsync(
        Guid userId,
        Guid conversationId,
        EffectExecutionContext context,
        ConversationEvent resultEvent,
        CancellationToken ct)
    {
        var transactionStarted = Stopwatch.GetTimestamp();
        using var _ = await store.AcquireLockAsync(conversationId, ct);

        var conversation = await LoadOwnedAsync(userId, conversationId, ct);
        var now = clock.GetUtcNow();

        var effect = conversation.FindEffect(context.EffectId);
        if (effect is null || effect.Status is not (EffectStatus.Pending or EffectStatus.Running))
        {
            // Late or duplicate result — must not overwrite newer state (v3 §7.4).
            logger.LogWarning(
                "AiCoach.EffectResult.Dropped ConversationId={ConversationId} EffectId={EffectId} ResultEvent={ResultEvent} Reason={Reason}",
                conversationId,
                context.EffectId,
                resultEvent.GetType().Name,
                TransitionRejection.StaleEffectResult);
            return (conversation, []);
        }

        var contexts = ReduceApplySave(conversation, resultEvent, out var transition);
        if (!transition.IsAccepted)
        {
            effect.MarkSuperseded(now);
            await store.SaveAsync(conversation, ct);
            logger.LogWarning(
                "AiCoach.EffectResult.Superseded ConversationId={ConversationId} EffectId={EffectId} ResultEvent={ResultEvent} Rejection={Rejection} ConversationVersion={ConversationVersion}",
                conversationId,
                context.EffectId,
                resultEvent.GetType().Name,
                transition.Rejection,
                conversation.Version);
            return (conversation, []);
        }

        var failed = resultEvent is ModelTurnFailed or ProposalSetPersistenceFailed;
        if (failed)
            effect.MarkFailed(now, resultEvent.GetType().Name);
        else
            effect.MarkCompleted(now);

        await store.SaveAsync(conversation, ct);
        logger.LogInformation(
            "AiCoach.EffectResult.Committed ConversationId={ConversationId} EffectId={EffectId} ResultEvent={ResultEvent} EffectStatus={EffectStatus} ConversationVersion={ConversationVersion} NextEffectCount={NextEffectCount} ElapsedMs={ElapsedMs}",
            conversationId,
            context.EffectId,
            resultEvent.GetType().Name,
            effect.Status,
            conversation.Version,
            contexts.Count,
            Stopwatch.GetElapsedTime(transactionStarted).TotalMilliseconds);
        return (conversation, contexts);
    }

    private List<EffectExecutionContext> ReduceApplySave(
        Conversation conversation,
        ConversationEvent input,
        out StateTransition transition)
    {
        var mode = modeRegistry.Get(conversation.Mode);
        var snapshot = conversation.ToSnapshot();
        transition = kernel.Apply(snapshot, input, mode);
        logger.LogInformation(
            "AiCoach.KernelTransition.Evaluated ConversationId={ConversationId} InputEvent={InputEvent} ConversationVersion={ConversationVersion} FromPhase={FromPhase} Accepted={Accepted} Rejection={Rejection} ToPhase={ToPhase} GenerationStatus={GenerationStatus} MutationCount={MutationCount} EffectCount={EffectCount} DomainEventCount={DomainEventCount} AllowedActionCount={AllowedActionCount}",
            conversation.Id,
            input.GetType().Name,
            snapshot.Version,
            snapshot.Phase,
            transition.IsAccepted,
            transition.Rejection,
            transition.IsAccepted ? transition.NextPhase : snapshot.Phase,
            transition.IsAccepted ? transition.NextGenerationStatus : snapshot.GenerationStatus,
            transition.Mutations.Count,
            transition.Effects.Count,
            transition.Events.Count,
            transition.AllowedActions.Count);
        if (!transition.IsAccepted)
            return [];

        var tracked = conversation.ApplyTransition(
            transition,
            clock.GetUtcNow(),
            TimeSpan.FromSeconds(options.Value.EffectLeaseSeconds));

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
        // Ownership failures map to 404 to avoid resource enumeration.
        if (conversation is null || conversation.UserId != userId)
            throw new ConversationNotFoundException();
        return conversation;
    }

    private static string SerializeForLog(object? value) => value is null
        ? "null"
        : JsonSerializer.Serialize(value, value.GetType());
}

using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Artifacts;
using BlotzTask.Modules.AiCoach.Domain;
using BlotzTask.Modules.AiCoach.Modes;
using BlotzTask.Modules.AiCoach.ModelTurn;
using BlotzTask.Modules.AiCoach.StateMachine;
using BlotzTask.Modules.AiCoach.Effects;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiCoach.Services;

public sealed record ConversationDispatchResult(
    bool Accepted, RuleViolation? Violation, AiConversation Conversation);

public interface IAiConversationKernel
{
    Task<ConversationDispatchResult> DispatchAsync(
        Guid userId, Guid conversationId, int expectedVersion,
        ConversationEvent input, CancellationToken cancellationToken);
}

public interface IAiConversationApplication
{
    Task<AiConversation> CreateAsync(Guid userId, AiCoachMode mode, CancellationToken cancellationToken);
    Task<AiConversation> GetAsync(Guid userId, Guid conversationId, CancellationToken cancellationToken);
}

public interface IConversationMutationHandler
{
    Type MutationType { get; }
    void Apply(AiConversation conversation, DomainMutation mutation);
}

public abstract class ConversationMutationHandler<TMutation> : IConversationMutationHandler
    where TMutation : DomainMutation
{
    public Type MutationType => typeof(TMutation);
    public abstract void Apply(AiConversation conversation, TMutation mutation);
    void IConversationMutationHandler.Apply(AiConversation conversation, DomainMutation mutation) =>
        Apply(conversation, (TMutation)mutation);
}

public sealed class AddConversationMessageMutationHandler
    : ConversationMutationHandler<AddConversationMessageMutation>
{
    public override void Apply(AiConversation conversation, AddConversationMessageMutation mutation) =>
        conversation.AddUserMessage(mutation.MessageId, mutation.Content, mutation.CreatedAt);
}

public sealed class AddAssistantMessageMutationHandler
    : ConversationMutationHandler<AddAssistantMessageMutation>
{
    public override void Apply(AiConversation conversation, AddAssistantMessageMutation mutation) =>
        conversation.AddAssistantMessage(mutation.MessageId, mutation.Content, mutation.CreatedAt);
}

public sealed class ExpireConversationMutationHandler : ConversationMutationHandler<ExpireConversationMutation>
{
    public override void Apply(AiConversation conversation, ExpireConversationMutation mutation) =>
        conversation.Expire(mutation.ExpiredAt);
}

public sealed class CommitProposedArtifactMutationHandler(IArtifactCommitRegistry artifacts)
    : ConversationMutationHandler<CommitProposedArtifactMutation>
{
    public override void Apply(
        AiConversation conversation,
        CommitProposedArtifactMutation mutation) =>
        artifacts.Commit(
            conversation,
            mutation.Proposal,
            mutation.CreatedByEffectId,
            mutation.CreatedAt);
}

public interface IConversationMutationRegistry
{
    void Apply(AiConversation conversation, IReadOnlyList<DomainMutation> mutations);
}

public sealed class ConversationMutationRegistry(IEnumerable<IConversationMutationHandler> handlers)
    : IConversationMutationRegistry
{
    private readonly IReadOnlyDictionary<Type, IConversationMutationHandler> _handlers = Build(handlers);

    public void Apply(AiConversation conversation, IReadOnlyList<DomainMutation> mutations)
    {
        foreach (var mutation in mutations)
        {
            if (!_handlers.TryGetValue(mutation.GetType(), out var handler))
                throw new InvalidOperationException($"No mutation handler is registered for '{mutation.GetType().Name}'.");
            handler.Apply(conversation, mutation);
        }
    }

    private static IReadOnlyDictionary<Type, IConversationMutationHandler> Build(
        IEnumerable<IConversationMutationHandler> handlers)
    {
        var all = handlers.ToArray();
        var duplicate = all.GroupBy(handler => handler.MutationType).FirstOrDefault(group => group.Count() > 1);
        if (duplicate is not null)
            throw new InvalidOperationException($"Mutation handler '{duplicate.Key.Name}' is registered more than once.");
        return all.ToDictionary(handler => handler.MutationType);
    }
}

internal interface IAiConversationStore
{
    Task<AiConversation> LoadAsync(Guid userId, Guid conversationId, CancellationToken cancellationToken);
    Task<AiConversation?> FindActiveAsync(Guid userId, string activeSlot, CancellationToken cancellationToken);
    Task SaveAsync(CancellationToken cancellationToken);
    Task<AiConversationEffect?> FindEffectAsync(
        Guid conversationId, Guid effectId, CancellationToken cancellationToken);
    void Add(AiConversation conversation);
    void ClearTracking();
}

internal sealed class AiConversationStore(
    BlotzTaskDbContext db,
    IArtifactDetailLoaderRegistry artifactLoaders) : IAiConversationStore
{
    public void Add(AiConversation conversation) => db.AiConversations.Add(conversation);
    public Task SaveAsync(CancellationToken cancellationToken) => db.SaveChangesAsync(cancellationToken);
    public void ClearTracking() => db.ChangeTracker.Clear();

    public Task<AiConversationEffect?> FindEffectAsync(
        Guid conversationId, Guid effectId, CancellationToken cancellationToken) =>
        db.AiConversationEffects.SingleOrDefaultAsync(
            effect => effect.ConversationId == conversationId && effect.Id == effectId,
            cancellationToken);

    public async Task<AiConversation?> FindActiveAsync(
        Guid userId, string activeSlot, CancellationToken cancellationToken)
    {
        var conversation = await QueryConversation(userId).SingleOrDefaultAsync(
            item => item.ActiveConversationSlot == activeSlot, cancellationToken);
        if (conversation is not null) await LoadRelatedDataAsync(conversation, cancellationToken);
        return conversation;
    }

    public async Task<AiConversation> LoadAsync(
        Guid userId, Guid conversationId, CancellationToken cancellationToken)
    {
        var conversation = await QueryConversation(userId).SingleOrDefaultAsync(
            item => item.Id == conversationId, cancellationToken)
            ?? throw new NotFoundException("AI Coach conversation not found.");
        await LoadRelatedDataAsync(conversation, cancellationToken);
        return conversation;
    }

    private IQueryable<AiConversation> QueryConversation(Guid userId)
    {
        var query = db.AiConversations
            .Where(conversation => conversation.UserId == userId)
            .Include(conversation => conversation.CurrentArtifact)
            .AsSplitQuery();

        return query;
    }

    private async Task LoadRelatedDataAsync(AiConversation conversation, CancellationToken cancellationToken)
    {
        if (conversation.CurrentArtifact is not null)
            await artifactLoaders.LoadAsync(conversation.CurrentArtifact, cancellationToken);
        var turns = await db.AiConversationMessages
            .Where(message => message.ConversationId == conversation.Id)
            .Select(message => message.TurnNumber).Distinct()
            .OrderByDescending(turn => turn).Take(20).ToArrayAsync(cancellationToken);
        if (turns.Length == 0) return;
        await db.AiConversationMessages
            .Where(message => message.ConversationId == conversation.Id && turns.Contains(message.TurnNumber))
            .OrderBy(message => message.TurnNumber).ThenBy(message => message.Sequence)
            .LoadAsync(cancellationToken);
    }
}

internal sealed class AiConversationApplication(
    IAiConversationStore store,
    IAiCoachModeRegistry modeRegistry,
    IConversationReducer reducer,
    IConversationSnapshotProjector projector,
    IConversationMutationRegistry mutations,
    TimeProvider timeProvider) : IAiConversationApplication
{
    public async Task<AiConversation> CreateAsync(
        Guid userId, AiCoachMode modeId, CancellationToken cancellationToken)
    {
        var mode = modeRegistry.Get(modeId);
        if (mode.ActiveConversationSlot is not null)
        {
            var existing = await store.FindActiveAsync(userId, mode.ActiveConversationSlot, cancellationToken);
            if (existing is not null)
            {
                existing = await EnsureLifecycleAsync(existing, cancellationToken);
                if (existing.LifecycleStatus == ConversationLifecycleStatus.Active) return existing;
            }
        }

        var conversation = AiConversation.Create(userId, mode, timeProvider.GetUtcNow());
        store.Add(conversation);
        try { await store.SaveAsync(cancellationToken); }
        catch (DbUpdateException) when (mode.ActiveConversationSlot is not null)
        {
            store.ClearTracking();
            var existing = await store.FindActiveAsync(userId, mode.ActiveConversationSlot, cancellationToken);
            if (existing is null) throw;
            return await EnsureLifecycleAsync(existing, cancellationToken);
        }
        return conversation;
    }

    public async Task<AiConversation> GetAsync(
        Guid userId, Guid conversationId, CancellationToken cancellationToken)
    {
        var conversation = await store.LoadAsync(userId, conversationId, cancellationToken);
        return await EnsureLifecycleAsync(conversation, cancellationToken);
    }

    private async Task<AiConversation> EnsureLifecycleAsync(
        AiConversation conversation, CancellationToken cancellationToken)
    {
        if (!conversation.IsExpiredAt(timeProvider.GetUtcNow())) return conversation;
        var result = reducer.Reduce(projector.ToDomain(conversation),
            new ConversationExpired(timeProvider.GetUtcNow()), modeRegistry.Get(conversation.Mode));
        if (result.Accepted)
        {
            mutations.Apply(conversation, result.Mutations);
            await store.SaveAsync(cancellationToken);
        }
        return conversation;
    }
}

internal sealed class AiConversationKernel(
    IAiConversationStore store,
    IAiConversationApplication application,
    IAiCoachModeRegistry modeRegistry,
    IConversationReducer reducer,
    IConversationSnapshotProjector projector,
    IConversationMutationRegistry mutations,
    IConversationEffectDispatcher effects,
    ILogger<AiConversationKernel> logger,
    TimeProvider timeProvider) : IAiConversationKernel
{
    public async Task<ConversationDispatchResult> DispatchAsync(
        Guid userId, Guid conversationId, int expectedVersion,
        ConversationEvent input, CancellationToken cancellationToken)
    {
        var conversation = await application.GetAsync(userId, conversationId, cancellationToken);
        if (conversation.Version != expectedVersion)
            return new ConversationDispatchResult(false, null, conversation);

        var transition = reducer.Reduce(projector.ToDomain(conversation), input, modeRegistry.Get(conversation.Mode));
        if (!transition.Accepted)
            return new ConversationDispatchResult(false, transition.Violation, conversation);

        mutations.Apply(conversation, transition.Mutations);
        if (transition.Mutations.All(mutation => mutation is not ExpireConversationMutation))
            conversation.ApplyTransition(transition.NextState, transition.NextGenerationStatus,
                transition.NextBlockedReason, timeProvider.GetUtcNow());

        var pendingEffects = transition.Effects.Select(effectRequest =>
            CreateEffect(conversation, effectRequest)).ToArray();
        foreach (var effect in pendingEffects)
        {
            effect.AcquireLease(timeProvider.GetUtcNow().AddMinutes(2), timeProvider.GetUtcNow());
            conversation.Effects.Add(effect);
        }

        try { await store.SaveAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        {
            store.ClearTracking();
            var latest = await application.GetAsync(userId, conversationId, cancellationToken);
            return new ConversationDispatchResult(false, null, latest);
        }
        foreach (var effect in pendingEffects)
        {
            ConversationEventResult effectResult;
            try
            {
                effectResult = await effects.DispatchAsync(effect, cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogError(
                    exception,
                    "AI Coach effect {EffectId} failed before producing a result event.",
                    effect.Id);
                effectResult = new ConversationEventResult(
                    effect.Id,
                    effect.BaseConversationVersion,
                    new ModelGenerationFailed(
                        effect.Id,
                        effect.BaseConversationVersion,
                        "effect_handler_failed",
                        GenerationBlockedReason.ModelUnavailable,
                        timeProvider.GetUtcNow()));
            }

            store.ClearTracking();
            conversation = await application.GetAsync(userId, conversationId, CancellationToken.None);
            var currentEffect = await store.FindEffectAsync(
                conversationId, effectResult.EffectId, CancellationToken.None);
            if (currentEffect is null
                || currentEffect.Status != ConversationEffectStatus.Running
                || currentEffect.BaseConversationVersion != effectResult.BaseConversationVersion
                || conversation.Version != effectResult.BaseConversationVersion)
            {
                currentEffect?.Supersede(timeProvider.GetUtcNow());
                if (currentEffect is not null)
                    await store.SaveAsync(CancellationToken.None);
                return new ConversationDispatchResult(false, null, conversation);
            }

            if (effectResult.ResultEvent is not ConversationEvent resultEvent)
                throw new InvalidOperationException("Conversation effect returned an unsupported result event.");
            var resultTransition = reducer.Reduce(
                projector.ToDomain(conversation), resultEvent, modeRegistry.Get(conversation.Mode));
            if (!resultTransition.Accepted)
            {
                currentEffect.Supersede(timeProvider.GetUtcNow());
                await store.SaveAsync(CancellationToken.None);
                return new ConversationDispatchResult(false, resultTransition.Violation, conversation);
            }

            mutations.Apply(conversation, resultTransition.Mutations);
            conversation.ApplyTransition(
                resultTransition.NextState,
                resultTransition.NextGenerationStatus,
                resultTransition.NextBlockedReason,
                timeProvider.GetUtcNow());
            if (resultEvent is ModelTurnCompleted or ClarificationRequested or OneOffTaskDraftProposed)
                currentEffect.Complete(timeProvider.GetUtcNow());
            else
                currentEffect.Fail(ResultErrorCode(resultEvent), timeProvider.GetUtcNow());

            try { await store.SaveAsync(CancellationToken.None); }
            catch (DbUpdateConcurrencyException)
            {
                store.ClearTracking();
                var latest = await application.GetAsync(userId, conversationId, CancellationToken.None);
                return new ConversationDispatchResult(false, null, latest);
            }
            catch (DbUpdateException exception)
            {
                logger.LogWarning(
                    exception,
                    "AI Coach result transaction failed for effect {EffectId}.",
                    currentEffect.Id);
                store.ClearTracking();
                var latest = await application.GetAsync(userId, conversationId, CancellationToken.None);
                return new ConversationDispatchResult(false, null, latest);
            }
        }

        return new ConversationDispatchResult(true, null, conversation);
    }

    private static AiConversationEffect CreateEffect(
        AiConversation conversation,
        ConversationEffectRequest request)
    {
        if (request is not GenerateModelTurnEffectRequest modelTurn
            || !IsSupportedModelTurn(modelTurn))
            throw new InvalidOperationException(
                $"Unsupported conversation effect request '{request.GetType().Name}'.");

        return AiConversationEffect.Create(
                conversation.Id,
                conversation.Version,
                GenerateModelTurnEffectHandler.Type,
                GenerateModelTurnEffectHandler.Version,
                $"model-turn:{conversation.Id}:{conversation.Version}",
                conversation.UpdatedAt);
    }

    private static bool IsSupportedModelTurn(GenerateModelTurnEffectRequest request) =>
        (request.Purpose, request.Objective) is
            (ModelPurpose.Clarification, TurnObjectiveKey.ClarifyOneCoreRequirement)
            or (ModelPurpose.TaskDraft, TurnObjectiveKey.ProposeOneOffTaskDraft);

    private static string ResultErrorCode(ConversationEvent resultEvent) => resultEvent switch
    {
        ModelGenerationFailed failed => failed.ErrorCode,
        QuotaBlocked => "quota_exceeded",
        ContentFiltered => "content_filtered",
        _ => "model_turn_failed"
    };
}

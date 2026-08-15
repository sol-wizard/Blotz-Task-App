using BlotzTask.Modules.AiCoach.Artifacts;
using BlotzTask.Modules.AiCoach.Domain;
using BlotzTask.Modules.AiCoach.Modes;

namespace BlotzTask.Modules.AiCoach.StateMachine;

public enum ConversationAction { SendMessage, UpdateArtifact, RejectArtifact, PersistTask }

public sealed record CurrentArtifactSnapshot(
    Guid Id, ArtifactType Type, int SchemaVersion, int Version, ArtifactStatus Status);

public sealed record ConversationSnapshot(
    Guid ConversationId, Guid UserId, AiCoachMode Mode,
    ConversationLifecycleStatus LifecycleStatus, ConversationState State,
    GenerationStatus GenerationStatus, GenerationBlockedReason? BlockedReason,
    int Version, CurrentArtifactSnapshot? CurrentArtifact,
    IReadOnlySet<ConversationAction> AllowedActions);

public abstract record ConversationEvent;
public sealed record UserMessageReceived(Guid MessageId, string Content, DateTimeOffset OccurredAt) : ConversationEvent;
public sealed record ConversationExpired(DateTimeOffset OccurredAt) : ConversationEvent;

public abstract record DomainMutation;
public sealed record AddConversationMessageMutation(Guid MessageId, string Content, DateTimeOffset CreatedAt) : DomainMutation;
public sealed record ExpireConversationMutation(DateTimeOffset ExpiredAt) : DomainMutation;

public abstract record ConversationEffectRequest;
public abstract record ConversationDomainEvent;

public enum RuleViolation
{
    UnsupportedEvent, InvalidState, ConversationNotActive, GenerationInProgress,
    CurrentArtifactPending, EmptyMessage, MessageTooLong
}

public sealed record TransitionResult(
    bool Accepted, RuleViolation? Violation, ConversationState NextState,
    GenerationStatus NextGenerationStatus, GenerationBlockedReason? NextBlockedReason,
    IReadOnlyList<DomainMutation> Mutations, IReadOnlyList<ConversationEffectRequest> Effects,
    IReadOnlyList<ConversationDomainEvent> Events, IReadOnlySet<ConversationAction> AllowedActions)
{
    public static TransitionResult Rejected(ConversationSnapshot current, RuleViolation violation) =>
        new(false, violation, current.State, current.GenerationStatus, current.BlockedReason,
            [], [], [], current.AllowedActions);
}

public interface IConversationTransitionHandler
{
    Type EventType { get; }
    TransitionResult Reduce(ConversationSnapshot current, ConversationEvent input, AiCoachModeDefinition mode);
}

public interface IConversationTransitionHandler<in TEvent> : IConversationTransitionHandler
    where TEvent : ConversationEvent
{
    TransitionResult Reduce(ConversationSnapshot current, TEvent input, AiCoachModeDefinition mode);
}

public abstract class ConversationTransitionHandler<TEvent> : IConversationTransitionHandler<TEvent>
    where TEvent : ConversationEvent
{
    public Type EventType => typeof(TEvent);
    public abstract TransitionResult Reduce(ConversationSnapshot current, TEvent input, AiCoachModeDefinition mode);
    TransitionResult IConversationTransitionHandler.Reduce(
        ConversationSnapshot current, ConversationEvent input, AiCoachModeDefinition mode) =>
        Reduce(current, (TEvent)input, mode);
}

public interface IConversationTransitionRegistry
{
    IConversationTransitionHandler? Resolve(Type eventType);
}

public sealed class ConversationTransitionRegistry(IEnumerable<IConversationTransitionHandler> handlers)
    : IConversationTransitionRegistry
{
    private readonly IReadOnlyDictionary<Type, IConversationTransitionHandler> _handlers = Build(handlers);
    public IConversationTransitionHandler? Resolve(Type eventType) => _handlers.GetValueOrDefault(eventType);

    private static IReadOnlyDictionary<Type, IConversationTransitionHandler> Build(
        IEnumerable<IConversationTransitionHandler> handlers)
    {
        var all = handlers.ToArray();
        var duplicate = all.GroupBy(handler => handler.EventType).FirstOrDefault(group => group.Count() > 1);
        if (duplicate is not null)
            throw new InvalidOperationException($"Multiple transition handlers are registered for '{duplicate.Key.Name}'.");
        return all.ToDictionary(handler => handler.EventType);
    }
}

public interface IConversationReducer
{
    TransitionResult Reduce(ConversationSnapshot current, ConversationEvent input, AiCoachModeDefinition mode);
}

public sealed class ConversationReducer(IConversationTransitionRegistry registry) : IConversationReducer
{
    public TransitionResult Reduce(ConversationSnapshot current, ConversationEvent input, AiCoachModeDefinition mode)
    {
        if (!mode.TransitionPolicy.Allows(current.State, input.GetType()))
            return TransitionResult.Rejected(current, RuleViolation.InvalidState);
        var handler = registry.Resolve(input.GetType());
        return handler is null
            ? TransitionResult.Rejected(current, RuleViolation.UnsupportedEvent)
            : handler.Reduce(current, input, mode);
    }
}

public interface IAllowedActionResolver
{
    IReadOnlySet<ConversationAction> Resolve(
        ConversationLifecycleStatus lifecycleStatus, ConversationState state,
        GenerationStatus generationStatus, CurrentArtifactSnapshot? currentArtifact);
}

public sealed class AllowedActionResolver(IArtifactRegistry artifactRegistry) : IAllowedActionResolver
{
    public IReadOnlySet<ConversationAction> Resolve(
        ConversationLifecycleStatus lifecycleStatus, ConversationState state,
        GenerationStatus generationStatus, CurrentArtifactSnapshot? currentArtifact)
    {
        if (lifecycleStatus != ConversationLifecycleStatus.Active || generationStatus == GenerationStatus.Running)
            return new HashSet<ConversationAction>();
        if (currentArtifact is not null)
            return artifactRegistry.ResolveAllowedActions(currentArtifact, state);
        return state is ConversationState.Idle or ConversationState.Conversing or ConversationState.Clarifying
            ? new HashSet<ConversationAction> { ConversationAction.SendMessage }
            : new HashSet<ConversationAction>();
    }
}

public sealed class UserMessageReceivedTransitionHandler(IAllowedActionResolver actions)
    : ConversationTransitionHandler<UserMessageReceived>
{
    public override TransitionResult Reduce(
        ConversationSnapshot current, UserMessageReceived input, AiCoachModeDefinition mode)
    {
        if (current.LifecycleStatus != ConversationLifecycleStatus.Active)
            return TransitionResult.Rejected(current, RuleViolation.ConversationNotActive);
        if (current.GenerationStatus == GenerationStatus.Running)
            return TransitionResult.Rejected(current, RuleViolation.GenerationInProgress);
        if (current.CurrentArtifact is { Status: ArtifactStatus.Pending or ArtifactStatus.Processing })
            return TransitionResult.Rejected(current, RuleViolation.CurrentArtifactPending);
        if (string.IsNullOrWhiteSpace(input.Content))
            return TransitionResult.Rejected(current, RuleViolation.EmptyMessage);
        var content = input.Content.Trim();
        if (content.Length > 10_000)
            return TransitionResult.Rejected(current, RuleViolation.MessageTooLong);

        const ConversationState next = ConversationState.Conversing;
        return new TransitionResult(true, null, next, GenerationStatus.Idle, null,
            [new AddConversationMessageMutation(input.MessageId, content, input.OccurredAt)], [], [],
            actions.Resolve(current.LifecycleStatus, next, GenerationStatus.Idle, null));
    }
}

public sealed class ConversationExpiredTransitionHandler : ConversationTransitionHandler<ConversationExpired>
{
    public override TransitionResult Reduce(
        ConversationSnapshot current, ConversationExpired input, AiCoachModeDefinition mode) =>
        current.LifecycleStatus != ConversationLifecycleStatus.Active
            ? TransitionResult.Rejected(current, RuleViolation.ConversationNotActive)
            : new TransitionResult(true, null, ConversationState.Closed, GenerationStatus.Idle, null,
                [new ExpireConversationMutation(input.OccurredAt)], [], [], new HashSet<ConversationAction>());
}

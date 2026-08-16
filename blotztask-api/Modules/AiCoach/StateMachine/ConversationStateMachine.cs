using BlotzTask.Modules.AiCoach.Artifacts;
using BlotzTask.Modules.AiCoach.Domain;
using BlotzTask.Modules.AiCoach.Modes;
using BlotzTask.Modules.AiCoach.ModelTurn;

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
public sealed record ModelTurnCompleted(
    Guid EffectId, int BaseConversationVersion, ControlledModelOutcome Outcome,
    DateTimeOffset OccurredAt) : ConversationEvent;
public sealed record ClarificationRequested(
    Guid EffectId, int BaseConversationVersion, ControlledModelOutcome Outcome,
    DateTimeOffset OccurredAt) : ConversationEvent;
public sealed record ModelGenerationFailed(
    Guid EffectId, int BaseConversationVersion, string ErrorCode,
    GenerationBlockedReason BlockedReason, DateTimeOffset OccurredAt) : ConversationEvent;
public sealed record QuotaBlocked(
    Guid EffectId, int BaseConversationVersion, DateTimeOffset OccurredAt) : ConversationEvent;
public sealed record ContentFiltered(
    Guid EffectId, int BaseConversationVersion, DateTimeOffset OccurredAt) : ConversationEvent;

public abstract record DomainMutation;
public sealed record AddConversationMessageMutation(Guid MessageId, string Content, DateTimeOffset CreatedAt) : DomainMutation;
public sealed record ExpireConversationMutation(DateTimeOffset ExpiredAt) : DomainMutation;
public sealed record AddAssistantMessageMutation(
    Guid MessageId, string Content, DateTimeOffset CreatedAt) : DomainMutation;

public abstract record ConversationEffectRequest;
public sealed record GenerateModelTurnEffectRequest(
    ModelPurpose Purpose,
    TurnObjectiveKey Objective) : ConversationEffectRequest;
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

        var next = current.State == ConversationState.Clarifying
            ? ConversationState.Clarifying
            : ConversationState.Conversing;
        return new TransitionResult(true, null, next, GenerationStatus.Running, null,
            [new AddConversationMessageMutation(input.MessageId, content, input.OccurredAt)],
            [new GenerateModelTurnEffectRequest(
                ModelPurpose.Clarification,
                TurnObjectiveKey.ClarifyOneCoreRequirement)],
            [],
            actions.Resolve(current.LifecycleStatus, next, GenerationStatus.Running, null));
    }
}

public abstract class ModelResultTransitionHandler<TEvent>(IAllowedActionResolver actions)
    : ConversationTransitionHandler<TEvent> where TEvent : ConversationEvent
{
    protected TransitionResult Complete(
        ConversationSnapshot current,
        ConversationState nextState,
        Guid messageId,
        string assistantMessage,
        DateTimeOffset occurredAt) =>
        new(true, null, nextState, GenerationStatus.Idle, null,
            [new AddAssistantMessageMutation(messageId, assistantMessage, occurredAt)],
            [], [],
            actions.Resolve(current.LifecycleStatus, nextState, GenerationStatus.Idle, null));

    protected TransitionResult Block(
        ConversationSnapshot current,
        GenerationBlockedReason reason) =>
        new(true, null, current.State, GenerationStatus.Blocked, reason,
            [], [], [],
            actions.Resolve(current.LifecycleStatus, current.State, GenerationStatus.Blocked, null));
}

public sealed class ModelTurnCompletedTransitionHandler(IAllowedActionResolver actions)
    : ModelResultTransitionHandler<ModelTurnCompleted>(actions)
{
    public override TransitionResult Reduce(
        ConversationSnapshot current, ModelTurnCompleted input, AiCoachModeDefinition mode) =>
        current.GenerationStatus != GenerationStatus.Running
            ? TransitionResult.Rejected(current, RuleViolation.InvalidState)
            : Complete(current, ConversationState.Conversing, input.EffectId,
                input.Outcome.AssistantMessage, input.OccurredAt);
}

public sealed class ClarificationRequestedTransitionHandler(IAllowedActionResolver actions)
    : ModelResultTransitionHandler<ClarificationRequested>(actions)
{
    public override TransitionResult Reduce(
        ConversationSnapshot current, ClarificationRequested input, AiCoachModeDefinition mode) =>
        current.GenerationStatus != GenerationStatus.Running
            ? TransitionResult.Rejected(current, RuleViolation.InvalidState)
            : Complete(current, ConversationState.Clarifying, input.EffectId,
                input.Outcome.AssistantMessage, input.OccurredAt);
}

public sealed class ModelGenerationFailedTransitionHandler(IAllowedActionResolver actions)
    : ModelResultTransitionHandler<ModelGenerationFailed>(actions)
{
    public override TransitionResult Reduce(
        ConversationSnapshot current, ModelGenerationFailed input, AiCoachModeDefinition mode) =>
        current.GenerationStatus != GenerationStatus.Running
            ? TransitionResult.Rejected(current, RuleViolation.InvalidState)
            : Block(current, input.BlockedReason);
}

public sealed class QuotaBlockedTransitionHandler(IAllowedActionResolver actions)
    : ModelResultTransitionHandler<QuotaBlocked>(actions)
{
    public override TransitionResult Reduce(
        ConversationSnapshot current, QuotaBlocked input, AiCoachModeDefinition mode) =>
        current.GenerationStatus != GenerationStatus.Running
            ? TransitionResult.Rejected(current, RuleViolation.InvalidState)
            : Block(current, GenerationBlockedReason.Quota);
}

public sealed class ContentFilteredTransitionHandler(IAllowedActionResolver actions)
    : ModelResultTransitionHandler<ContentFiltered>(actions)
{
    public override TransitionResult Reduce(
        ConversationSnapshot current, ContentFiltered input, AiCoachModeDefinition mode) =>
        current.GenerationStatus != GenerationStatus.Running
            ? TransitionResult.Rejected(current, RuleViolation.InvalidState)
            : Block(current, GenerationBlockedReason.ContentFiltered);
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

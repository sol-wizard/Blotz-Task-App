using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Kernel;

/// <summary>
/// The Conversation Kernel (v3 tech design §17): deterministically maps Current Snapshot +
/// ConversationEvent onto a <see cref="StateTransition"/>. Pure — no store, no model, no clock,
/// no I/O. Model candidates never reach it directly; they arrive folded into a
/// <see cref="ValidatedTurnOutcome"/> after Post-Policy and all mandatory Guards.
/// </summary>
public interface IConversationKernel
{
    StateTransition Apply(
        ConversationSnapshot current,
        ConversationEvent input,
        AiCoachModeDefinition mode);
}

/// <summary>
/// Strongly-typed transition handler (v3 tech design §17.2): one handler per event type,
/// registered instead of growing a central switch. Unknown events are uniformly rejected as
/// UnsupportedEvent — never a default phase jump.
/// </summary>
public interface IConversationTransitionHandler<in TEvent>
    where TEvent : ConversationEvent
{
    IReadOnlySet<ConversationPhase> SupportedPhases { get; }

    StateTransition Reduce(
        ConversationSnapshot current,
        TEvent input,
        AiCoachModeDefinition mode);
}

public sealed class ConversationKernel : IConversationKernel
{
    private readonly UserMessageReceivedHandler _userMessage = new();
    private readonly ModelTurnCompletedHandler _modelTurnCompleted = new();
    private readonly ModelTurnFailedHandler _modelTurnFailed = new();
    private readonly ConfirmProposalSetRequestedHandler _confirm = new();
    private readonly RejectProposalSetRequestedHandler _reject = new();
    private readonly ProposalSetPersistenceSucceededHandler _persistSucceeded = new();
    private readonly ProposalSetPersistenceFailedHandler _persistFailed = new();

    public StateTransition Apply(
        ConversationSnapshot current,
        ConversationEvent input,
        AiCoachModeDefinition mode)
    {
        if (current.Phase == ConversationPhase.Closed)
            return StateTransition.Rejected(TransitionRejection.ConversationClosed);

        if (!mode.SupportedPhases.Contains(current.Phase))
            return StateTransition.Rejected(TransitionRejection.InvalidPhase);

        return input switch
        {
            UserMessageReceived e => Dispatch(_userMessage, current, e, mode),
            ModelTurnCompleted e => Dispatch(_modelTurnCompleted, current, e, mode),
            ModelTurnFailed e => Dispatch(_modelTurnFailed, current, e, mode),
            ConfirmProposalSetRequested e => Dispatch(_confirm, current, e, mode),
            RejectProposalSetRequested e => Dispatch(_reject, current, e, mode),
            ProposalSetPersistenceSucceeded e => Dispatch(_persistSucceeded, current, e, mode),
            ProposalSetPersistenceFailed e => Dispatch(_persistFailed, current, e, mode),
            _ => StateTransition.Rejected(TransitionRejection.UnsupportedEvent),
        };
    }

    private static StateTransition Dispatch<TEvent>(
        IConversationTransitionHandler<TEvent> handler,
        ConversationSnapshot current,
        TEvent input,
        AiCoachModeDefinition mode)
        where TEvent : ConversationEvent
    {
        return handler.SupportedPhases.Contains(current.Phase)
            ? handler.Reduce(current, input, mode)
            : StateTransition.Rejected(TransitionRejection.InvalidPhase);
    }
}

/// <summary>
/// Canonical allowedActions sets. Computed server-side only — the client renders exactly what
/// it receives (schema-2 protocol §18).
/// </summary>
internal static class ActionSets
{
    /// <summary>Nothing can be submitted (generation or confirmation in flight, or quota-blocked).</summary>
    public static readonly IReadOnlySet<ConversationAction> None =
        new HashSet<ConversationAction>();

    public static readonly IReadOnlySet<ConversationAction> ChatOnly =
        new HashSet<ConversationAction> { ConversationAction.SendMessage };

    /// <summary>A single-task card is on screen: start now, add to list, reject, and free chat.</summary>
    private static readonly IReadOnlySet<ConversationAction> SinglePending =
        new HashSet<ConversationAction>
        {
            ConversationAction.SendMessage,
            ConversationAction.StartNow,
            ConversationAction.AddToTaskList,
            ConversationAction.RejectDraft,
        };

    /// <summary>
    /// A multi-task card is on screen. No "start now": a focus timer is for one task, and the
    /// user can start any of them from the task list after saving.
    /// </summary>
    private static readonly IReadOnlySet<ConversationAction> BatchPending =
        new HashSet<ConversationAction>
        {
            ConversationAction.SendMessage,
            ConversationAction.AddToTaskList,
            ConversationAction.RejectDraft,
        };

    public static IReadOnlySet<ConversationAction> ForPendingSet(bool isSingle) =>
        isSingle ? SinglePending : BatchPending;

    public static IReadOnlySet<ConversationAction> ForPendingSet(ProposalSetSnapshot? set) =>
        set is null ? ChatOnly : ForPendingSet(set.IsSingle);
}

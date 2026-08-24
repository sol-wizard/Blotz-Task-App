using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;

namespace BlotzTask.Modules.AiCoach.Domain.Rules;

/// <summary>
/// Dispatches events to strongly-typed transition handlers by event type + current state
/// (tech design §12.1). Unknown events are uniformly rejected as UnsupportedEvent — never a
/// default state jump.
/// </summary>
public sealed class ConversationReducer : IConversationReducer
{
    private readonly UserMessageReceivedHandler _userMessage = new();
    private readonly ModelTurnCompletedHandler _modelTurnCompleted = new();
    private readonly ModelGenerationFailedHandler _modelGenerationFailed = new();
    private readonly ConfirmTaskDraftRequestedHandler _confirmDraft = new();
    private readonly RejectTaskDraftRequestedHandler _rejectDraft = new();
    private readonly DraftPersistenceSucceededHandler _persistSucceeded = new();
    private readonly DraftPersistenceFailedHandler _persistFailed = new();

    public TransitionResult Reduce(
        ConversationSnapshot current,
        ConversationEvent input,
        AiCoachModeDefinition mode)
    {
        if (current.LifecycleStatus != ConversationLifecycleStatus.Active)
            return TransitionResult.Rejected(RuleViolation.ConversationClosed);

        if (!mode.SupportedStates.Contains(current.State))
            return TransitionResult.Rejected(RuleViolation.InvalidState);

        return input switch
        {
            UserMessageReceived e => Dispatch(_userMessage, current, e, mode),
            ModelTurnCompleted e => Dispatch(_modelTurnCompleted, current, e, mode),
            ModelGenerationFailed e => Dispatch(_modelGenerationFailed, current, e, mode),
            ConfirmTaskDraftRequested e => Dispatch(_confirmDraft, current, e, mode),
            RejectTaskDraftRequested e => Dispatch(_rejectDraft, current, e, mode),
            DraftPersistenceSucceeded e => Dispatch(_persistSucceeded, current, e, mode),
            DraftPersistenceFailed e => Dispatch(_persistFailed, current, e, mode),
            _ => TransitionResult.Rejected(RuleViolation.UnsupportedEvent),
        };
    }

    private static TransitionResult Dispatch<TEvent>(
        IConversationTransitionHandler<TEvent> handler,
        ConversationSnapshot current,
        TEvent input,
        AiCoachModeDefinition mode)
        where TEvent : ConversationEvent
    {
        return handler.SupportedStates.Contains(current.State)
            ? handler.Reduce(current, input, mode)
            : TransitionResult.Rejected(RuleViolation.InvalidState);
    }
}

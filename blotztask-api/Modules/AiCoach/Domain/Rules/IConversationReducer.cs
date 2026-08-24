using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;

namespace BlotzTask.Modules.AiCoach.Domain.Rules;

/// <summary>Single reducer entry point (tech design §12). Pure: no store, no model, no clock.</summary>
public interface IConversationReducer
{
    TransitionResult Reduce(
        ConversationSnapshot current,
        ConversationEvent input,
        AiCoachModeDefinition mode);
}

/// <summary>
/// Strongly-typed transition handler (tech design §12.1). The reducer looks handlers up by
/// event type + current state instead of growing a central switch.
/// </summary>
public interface IConversationTransitionHandler<in TEvent>
    where TEvent : ConversationEvent
{
    IReadOnlySet<ConversationState> SupportedStates { get; }

    TransitionResult Reduce(
        ConversationSnapshot current,
        TEvent input,
        AiCoachModeDefinition mode);
}

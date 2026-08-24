namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Primary conversation interaction phase (tech design §10). This dimension only tracks
/// the user-facing dialogue stage. Generation progress, artifact lifecycle and effect
/// progress are orthogonal dimensions (<see cref="GenerationStatus"/>,
/// <see cref="Artifacts.ArtifactStatus"/>, <see cref="EffectStatus"/>) and must never
/// be expressed by inventing extra states here.
/// </summary>
public enum ConversationState
{
    Idle = 0,
    Conversing = 1,
    Clarifying = 2,
    AwaitingSuggestionConfirmation = 3,
    DraftPending = 4,
    DraftHandled = 5,
    AwaitingIntegrationChoice = 6,
    AwaitingNextChoice = 7,
    Closed = 8,

    // Companion mode only (not used by v1 Execution mode, reserved per §10).
    MicroActionPending = 9,
}

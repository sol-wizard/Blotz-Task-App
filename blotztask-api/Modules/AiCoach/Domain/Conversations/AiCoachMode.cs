namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// The registered AI Coach working modes.
/// </summary>
public enum AiCoachMode
{
    Execution = 0,
    Clarify = 1,
    Companion = 2,
    // Single-chat prompt under product testing alongside the three modes above.
    Unified = 3,
}

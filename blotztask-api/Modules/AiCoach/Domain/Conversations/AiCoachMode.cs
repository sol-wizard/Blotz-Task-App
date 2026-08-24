namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// The three AI Coach working modes (tech design §13). V1 ships Execution only,
/// but the mode registry and all policy surfaces are structured to hold all three.
/// </summary>
public enum AiCoachMode
{
    Execution = 0,
    Clarify = 1,
    Companion = 2,
}

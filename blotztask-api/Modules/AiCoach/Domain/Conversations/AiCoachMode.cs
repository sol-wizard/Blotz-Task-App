namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// The three AI Coach working modes. Execution and Companion are currently registered;
/// Clarify remains a policy-only definition until its own production dependencies are complete.
/// </summary>
public enum AiCoachMode
{
    Execution = 0,
    Clarify = 1,
    Companion = 2,
}

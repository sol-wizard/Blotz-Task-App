namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Orthogonal model-generation dimension (v3 tech design §6). Quota exhaustion, content
/// filtering and model outages set <see cref="Blocked"/> plus a <see cref="BlockedReason"/> —
/// they never fabricate a new <see cref="ConversationPhase"/>.
/// </summary>
public enum GenerationStatus
{
    Idle = 0,
    Running = 1,
    Blocked = 2,
}

public enum BlockedReason
{
    None = 0,
    Quota = 1,
    ContentFiltered = 2,
    ModelUnavailable = 3,
    ConfigurationError = 4,
    Other = 5,
}

/// <summary>Lifecycle of a persisted (in-memory for v1) conversation effect (v3 tech design §7.4).</summary>
public enum EffectStatus
{
    Pending = 0,
    Running = 1,
    Completed = 2,
    Failed = 3,
    Superseded = 4,
    Cancelled = 5,
}

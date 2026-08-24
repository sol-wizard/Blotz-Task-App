using BlotzTask.Modules.AiCoach.Domain.Artifacts;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Everything that can drive the state machine is expressed as an event (tech design §9.2, §11).
/// Naming convention (§11): *Requested = submitted input request; *Completed/*Generated = model or
/// effect results; *Succeeded/*Failed = committed deterministic business facts.
/// </summary>
public abstract record ConversationEvent;

// ---------- User input events (§11.1) ----------

public sealed record UserMessageReceived(
    Guid MessageId,
    string Content,
    DateTimeOffset OccurredAt) : ConversationEvent;

/// <summary>
/// User confirmed the current draft with one of the three primary actions. Field validation
/// and local-time resolution happen BEFORE dispatch (Application layer, tech design §22.6/§22.7);
/// the reducer only performs snapshot-level checks (state, artifact identity, action allowed).
/// </summary>
public sealed record ConfirmTaskDraftRequested(
    Guid CommandId,
    Guid ArtifactId,
    ConversationAction Action,
    ValidatedTaskDraft ValidatedDraft) : ConversationEvent;

public sealed record RejectTaskDraftRequested(
    Guid CommandId,
    Guid ArtifactId) : ConversationEvent;

// ---------- Model result events (§11.2) ----------

/// <summary>
/// A model effect finished one full turn (tech design §11.3 ModelTurnCompleted). The proposed
/// draft, when present, has already passed the Capability Guard + artifact validation inside the
/// Model Turn Executor; the reducer still decides whether it is accepted in the current state.
/// In Execution mode a completed turn without a draft is, by §8.1 of the requirements, a
/// clarification question.
/// </summary>
public sealed record ModelTurnCompleted(
    Guid EffectId,
    int BaseConversationVersion,
    string AssistantMessage,
    TaskDraftPayload? ProposedDraft) : ConversationEvent;

public sealed record ModelGenerationFailed(
    Guid EffectId,
    int BaseConversationVersion,
    AiGenerationErrorCode ErrorCode) : ConversationEvent;

public enum AiGenerationErrorCode
{
    Unknown = 0,
    QuotaExceeded = 1,
    ContentFiltered = 2,
    ModelUnavailable = 3,
    TimedOut = 4,
    InvalidModelResponse = 5,
    Cancelled = 6,
    ConfigurationError = 7,
}

// ---------- Deterministic business result events (§11.3) ----------

/// <summary>One draft item that became a formal task.</summary>
public sealed record PersistedDraftItem(Guid ItemId, int TaskId);

/// <summary>Every item on the card is now a formal task.</summary>
public sealed record DraftPersistenceSucceeded(
    Guid EffectId,
    Guid ArtifactId,
    IReadOnlyList<PersistedDraftItem> PersistedItems,
    ConversationAction Action,
    int FocusMinutes) : ConversationEvent;

/// <summary>
/// At least one item could not be saved. <paramref name="PersistedItems"/> carries the ones
/// that DID succeed before the failure so the draft records them and a retry only creates
/// the remaining tasks (never duplicates).
/// </summary>
public sealed record DraftPersistenceFailed(
    Guid EffectId,
    Guid ArtifactId,
    string ErrorCode,
    IReadOnlyList<PersistedDraftItem> PersistedItems) : ConversationEvent
{
    public DraftPersistenceFailed(Guid effectId, Guid artifactId, string errorCode)
        : this(effectId, artifactId, errorCode, []) { }
}

/// <summary>Resolved instants for one draft item (local date/time against its IANA zone).</summary>
public sealed record ValidatedTaskDraftItem(
    Guid ItemId,
    DateTimeOffset StartUtc,
    DateTimeOffset EndUtc);

/// <summary>
/// Draft after server-side re-validation (tech design §22.7): the normalized payload to write
/// back, each item's start/end as instants, and the server-computed focus minutes
/// (= min(15, ceil(duration)) of the single task — never model-decided; only meaningful for
/// start_now, which is only offered on single-task cards).
/// </summary>
public sealed record ValidatedTaskDraft(
    TaskDraftPayload Payload,
    IReadOnlyList<ValidatedTaskDraftItem> Items,
    int FocusMinutes);

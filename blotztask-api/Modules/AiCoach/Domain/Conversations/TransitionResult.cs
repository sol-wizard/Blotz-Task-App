using BlotzTask.Modules.AiCoach.Domain.Artifacts;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Deterministic outcome of one Reducer step (tech design §9.3). Reducers are pure:
/// they never touch the store, the model, the clock, or any I/O.
/// </summary>
public sealed record TransitionResult(
    bool IsAccepted,
    RuleViolation Violation,
    ConversationState NextState,
    GenerationStatus NextGenerationStatus,
    BlockedReason NextBlockedReason,
    IReadOnlyList<DomainMutation> Mutations,
    IReadOnlyList<ConversationEffectRequest> Effects,
    IReadOnlyList<DomainEvent> Events,
    IReadOnlySet<ConversationAction> AllowedActions)
{
    public static TransitionResult Rejected(RuleViolation violation) => new(
        IsAccepted: false,
        Violation: violation,
        NextState: default,
        NextGenerationStatus: default,
        NextBlockedReason: default,
        Mutations: [],
        Effects: [],
        Events: [],
        AllowedActions: new HashSet<ConversationAction>());

    public static TransitionResult MoveTo(
        ConversationState nextState,
        GenerationStatus generationStatus,
        IReadOnlySet<ConversationAction> allowedActions,
        BlockedReason blockedReason = BlockedReason.None,
        IReadOnlyList<DomainMutation>? mutations = null,
        IReadOnlyList<ConversationEffectRequest>? effects = null,
        IReadOnlyList<DomainEvent>? events = null) => new(
        IsAccepted: true,
        Violation: RuleViolation.None,
        NextState: nextState,
        NextGenerationStatus: generationStatus,
        NextBlockedReason: blockedReason,
        Mutations: mutations ?? [],
        Effects: effects ?? [],
        Events: events ?? [],
        AllowedActions: allowedActions);
}

public enum RuleViolation
{
    None = 0,
    UnsupportedEvent = 1,
    InvalidState = 2,
    StaleArtifact = 3,
    CapabilityNotAllowed = 4,
    GenerationInProgress = 5,
    GenerationBlocked = 6,
    ConversationClosed = 7,
    StaleEffectResult = 8,
    ActionNotAllowed = 9,
}

// ---------- Mutations (applied to the aggregate by the kernel, never by rules) ----------

public abstract record DomainMutation;

public sealed record AppendUserMessageMutation(Guid MessageId, string Content) : DomainMutation;

public sealed record AppendAssistantMessageMutation(string Content) : DomainMutation;

public sealed record CreateCurrentArtifactMutation(
    ArtifactType Type,
    int SchemaVersion,
    ArtifactPayload Payload) : DomainMutation;

public sealed record UpdateCurrentArtifactStatusMutation(
    Guid ArtifactId,
    ArtifactStatus Status) : DomainMutation;

/// <summary>Writes the normalized user-edited fields back onto the draft before persisting (§22.9 transaction A).</summary>
public sealed record UpdateCurrentArtifactPayloadMutation(
    Guid ArtifactId,
    ArtifactPayload Payload) : DomainMutation;

/// <summary>Marks one item of the draft card as a created formal task.</summary>
public sealed record RecordPersistedTaskMutation(
    Guid ArtifactId,
    Guid ItemId,
    int PersistedTaskId) : DomainMutation;

public sealed record ClearCurrentArtifactMutation(Guid ArtifactId) : DomainMutation;

public sealed record IncrementClarificationRoundMutation : DomainMutation;

public sealed record ResetClarificationMutation : DomainMutation;

// ---------- Domain events (published after commit; v1 has no outbox — TS-006 pending — so these
// are only used for structured logging) ----------

public abstract record DomainEvent;

public sealed record DraftCreated(Guid ArtifactId) : DomainEvent;

public sealed record DraftRejected(Guid ArtifactId) : DomainEvent;

public sealed record DraftPersisted(Guid ArtifactId, IReadOnlyList<int> TaskIds) : DomainEvent;

public sealed record QuotaBlocked : DomainEvent;

// ---------- Effect requests (materialized into tracked effects by the kernel) ----------

/// <summary>
/// A non-pure operation the state machine wants executed (tech design §9.4). The reducer only
/// requests it; the kernel assigns the EffectId, tracks status, and runs it outside any store
/// mutation (two-phase protocol, §16.1).
/// </summary>
public abstract record ConversationEffectRequest;

public sealed record GenerateModelTurnEffectRequest(Guid TriggeringMessageId) : ConversationEffectRequest;

public sealed record PersistDraftEffectRequest(
    Guid ArtifactId,
    ConversationAction Action,
    ValidatedTaskDraft ValidatedDraft) : ConversationEffectRequest;

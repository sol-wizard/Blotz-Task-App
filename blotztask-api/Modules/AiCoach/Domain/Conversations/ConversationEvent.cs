using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Everything that can drive the Kernel is expressed as an event (v3 tech design §7.5): the
/// Kernel deterministically maps Current Snapshot + ConversationEvent onto a
/// <see cref="StateTransition"/>. Model candidates are NOT events — they reach the Kernel only
/// after Post-Policy and all mandatory Guards, folded into <see cref="ValidatedTurnOutcome"/>.
/// Unknown events are uniformly rejected as UnsupportedEvent, never a default jump.
/// </summary>
public abstract record ConversationEvent;

// ---------- User input events ----------

public sealed record UserMessageReceived(
    Guid MessageId,
    string Content,
    DateTimeOffset OccurredAt) : ConversationEvent;

/// <summary>
/// User confirmed the current proposal set with one of the primary actions. Field validation
/// and local-time resolution happen BEFORE dispatch (Application layer, v3 §18); the Kernel
/// only performs snapshot-level checks (phase, set identity, action allowed).
/// </summary>
public sealed record ConfirmProposalSetRequested(
    Guid CommandId,
    Guid ProposalSetId,
    ConversationAction Action,
    ValidatedProposalSet Validated) : ConversationEvent;

public sealed record RejectProposalSetRequested(
    Guid CommandId,
    Guid ProposalSetId) : ConversationEvent;

// ---------- Model result events ----------

/// <summary>
/// A model turn finished and its candidate survived Post-Policy and the Guard pipeline. The
/// <see cref="ValidatedTurnOutcome"/> carries the FINAL strategy — the Kernel picks the
/// transition purely from it plus the current snapshot.
/// </summary>
public sealed record ModelTurnCompleted(
    Guid EffectId,
    int BaseConversationVersion,
    ValidatedTurnOutcome Outcome) : ConversationEvent;

public sealed record ModelTurnFailed(
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

/// <summary>
/// The turn after the whole pipeline: Post-Policy decision + guard-approved response text and
/// (when the final strategy is ShowProposalSet) the accepted proposal payload. This is the ONLY
/// shape in which model output ever reaches the Kernel.
/// </summary>
public sealed record ValidatedTurnOutcome(
    ConversationStrategy FinalStrategy,
    StrategyDecisionType DecisionType,
    StrategyReasonCode ReasonCode,
    string AssistantMessage,
    string? Question,
    IReadOnlyList<TaskProposal>? AcceptedProposals,
    bool FallbackUsed,
    ActivePlanningIntentSnapshot? PlanningIntentUpdate = null,
    ClarificationTopic? QuestionTopic = null,
    ClarificationResolution? ClarificationResolution = null);

// ---------- Deterministic business result events ----------

/// <summary>One proposal that became a formal task.</summary>
public sealed record PersistedProposal(Guid ProposalId, int TaskId);

/// <summary>Every proposal on the set is now a formal task.</summary>
public sealed record ProposalSetPersistenceSucceeded(
    Guid EffectId,
    Guid ProposalSetId,
    IReadOnlyList<PersistedProposal> PersistedProposals,
    ConversationAction Action,
    int FocusMinutes) : ConversationEvent;

/// <summary>
/// At least one proposal could not be saved. <paramref name="PersistedProposals"/> carries the
/// ones that DID succeed before the failure so the set records them and a retry only creates
/// the remaining tasks (never duplicates).
/// </summary>
public sealed record ProposalSetPersistenceFailed(
    Guid EffectId,
    Guid ProposalSetId,
    string ErrorCode,
    IReadOnlyList<PersistedProposal> PersistedProposals) : ConversationEvent
{
    public ProposalSetPersistenceFailed(Guid effectId, Guid proposalSetId, string errorCode)
        : this(effectId, proposalSetId, errorCode, []) { }
}

/// <summary>Resolved instants for one proposal (local date/time against its IANA zone).</summary>
public sealed record ValidatedProposalItem(
    Guid ProposalId,
    DateTimeOffset StartUtc,
    DateTimeOffset EndUtc);

/// <summary>
/// Proposal set after server-side re-validation of the user's edits (v3 §18): the normalized
/// proposals to write back, each unpersisted proposal's start/end as instants, and the
/// server-computed focus minutes (= min(15, ceil(duration)) of the single task — never
/// model-decided; only meaningful for start_now, which is only offered on single-task cards).
/// </summary>
public sealed record ValidatedProposalSet(
    IReadOnlyList<TaskProposal> Proposals,
    IReadOnlyList<ValidatedProposalItem> ToPersist,
    int FocusMinutes)
{
    public bool IsSingle => Proposals.Count == 1;
}

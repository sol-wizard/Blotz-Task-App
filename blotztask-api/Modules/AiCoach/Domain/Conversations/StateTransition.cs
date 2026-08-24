using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Deterministic outcome of one Kernel step (v3 tech design §7.5). The Kernel is pure: it never
/// touches the store, the model, the clock, or any I/O — the Application layer applies the
/// transition to the aggregate and materializes the requested effects.
/// </summary>
public sealed record StateTransition(
    bool IsAccepted,
    TransitionRejection Rejection,
    ConversationPhase NextPhase,
    GenerationStatus NextGenerationStatus,
    BlockedReason NextBlockedReason,
    IReadOnlySet<ConversationFact> AddFacts,
    IReadOnlySet<ConversationFact> RemoveFacts,
    IReadOnlyList<DomainMutation> Mutations,
    IReadOnlyList<ConversationEffectRequest> Effects,
    IReadOnlyList<ConversationDomainEvent> Events,
    IReadOnlySet<ConversationAction> AllowedActions)
{
    private static readonly IReadOnlySet<ConversationFact> NoFacts = new HashSet<ConversationFact>();

    public static StateTransition Rejected(TransitionRejection rejection) => new(
        IsAccepted: false,
        Rejection: rejection,
        NextPhase: default,
        NextGenerationStatus: default,
        NextBlockedReason: default,
        AddFacts: NoFacts,
        RemoveFacts: NoFacts,
        Mutations: [],
        Effects: [],
        Events: [],
        AllowedActions: new HashSet<ConversationAction>());

    public static StateTransition MoveTo(
        ConversationPhase nextPhase,
        GenerationStatus generationStatus,
        IReadOnlySet<ConversationAction> allowedActions,
        BlockedReason blockedReason = BlockedReason.None,
        IReadOnlySet<ConversationFact>? addFacts = null,
        IReadOnlySet<ConversationFact>? removeFacts = null,
        IReadOnlyList<DomainMutation>? mutations = null,
        IReadOnlyList<ConversationEffectRequest>? effects = null,
        IReadOnlyList<ConversationDomainEvent>? events = null) => new(
        IsAccepted: true,
        Rejection: TransitionRejection.None,
        NextPhase: nextPhase,
        NextGenerationStatus: generationStatus,
        NextBlockedReason: blockedReason,
        AddFacts: addFacts ?? NoFacts,
        RemoveFacts: removeFacts ?? NoFacts,
        Mutations: mutations ?? [],
        Effects: effects ?? [],
        Events: events ?? [],
        AllowedActions: allowedActions);
}

/// <summary>
/// Stable rejection reasons. <see cref="ToWireCode"/> keeps the exact error-code strings the
/// schema-2 client already handles (the unchanged mobile app switch-cases on these).
/// </summary>
public enum TransitionRejection
{
    None = 0,
    UnsupportedEvent = 1,
    ConversationClosed = 2,
    TurnInProgress = 3,
    GenerationBlocked = 4,
    StaleEffectResult = 5,
    ProposalSetNotCurrent = 6,
    InvalidPhase = 7,
    ActionNotAllowed = 8,
    PendingProposalSetAlreadyExists = 9,
}

public static class TransitionRejectionExtensions
{
    public static string ToWireCode(this TransitionRejection rejection) => rejection switch
    {
        TransitionRejection.TurnInProgress => "GenerationInProgress",
        TransitionRejection.GenerationBlocked => "GenerationBlocked",
        TransitionRejection.ConversationClosed => "ConversationClosed",
        TransitionRejection.ProposalSetNotCurrent => "StaleArtifact",
        TransitionRejection.InvalidPhase => "InvalidState",
        TransitionRejection.ActionNotAllowed => "ActionNotAllowed",
        TransitionRejection.StaleEffectResult => "StaleEffectResult",
        TransitionRejection.PendingProposalSetAlreadyExists => "StaleArtifact",
        _ => rejection.ToString(),
    };
}

// ---------- Mutations (applied to the aggregate by the Application layer, never by the Kernel) ----------

public abstract record DomainMutation;

public sealed record AppendUserMessageMutation(Guid MessageId, string Content) : DomainMutation;

public sealed record AppendAssistantMessageMutation(string Content) : DomainMutation;

public sealed record CreateProposalSetMutation(IReadOnlyList<TaskProposal> Proposals) : DomainMutation;

public sealed record UpdateProposalSetStatusMutation(Guid ProposalSetId, ProposalSetStatus Status) : DomainMutation;

/// <summary>Writes the normalized user-edited proposals back before persisting (v3 §18).</summary>
public sealed record ReplaceProposalsMutation(Guid ProposalSetId, IReadOnlyList<TaskProposal> Proposals) : DomainMutation;

/// <summary>Marks one proposal of the set as a created formal task.</summary>
public sealed record RecordPersistedTaskMutation(Guid ProposalSetId, Guid ProposalId, int PersistedTaskId) : DomainMutation;

public sealed record ClearCurrentProposalSetMutation(Guid ProposalSetId) : DomainMutation;

/// <summary>The assistant asked (another) question: track it and count the round.</summary>
public sealed record SetOpenQuestionMutation(string Question) : DomainMutation;

public sealed record ClearOpenQuestionMutation : DomainMutation;

// ---------- Domain events (v1 has no outbox — used for structured logging only) ----------

public abstract record ConversationDomainEvent;

public sealed record ProposalSetCreated(int ProposalCount) : ConversationDomainEvent;

public sealed record ProposalSetRejected(Guid ProposalSetId) : ConversationDomainEvent;

public sealed record ProposalSetPersisted(Guid ProposalSetId, IReadOnlyList<int> TaskIds) : ConversationDomainEvent;

public sealed record QuotaBlocked : ConversationDomainEvent;

// ---------- Effect requests (materialized into tracked effects by the Application layer) ----------

/// <summary>
/// A non-pure operation the Kernel wants executed (v3 §7.2). The Kernel only requests it; the
/// Application layer assigns the EffectId, tracks status + lease, and runs it outside any store
/// lock (Transaction A / Transaction B protocol).
/// </summary>
public abstract record ConversationEffectRequest;

public sealed record GenerateModelTurnEffectRequest(Guid TriggeringMessageId) : ConversationEffectRequest;

public sealed record PersistProposalSetEffectRequest(
    Guid ProposalSetId,
    ConversationAction Action,
    ValidatedProposalSet Validated) : ConversationEffectRequest;

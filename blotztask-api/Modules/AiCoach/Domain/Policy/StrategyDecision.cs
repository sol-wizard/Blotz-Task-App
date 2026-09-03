namespace BlotzTask.Modules.AiCoach.Domain.Policy;

/// <summary>
/// Output of the Post-Policy (v3 tech design §12): the final strategy for this turn, how it was
/// reached, and whether the model's response / proposal candidates are used.
/// </summary>
public sealed record StrategyDecision(
    ConversationStrategy FinalStrategy,
    StrategyDecisionType DecisionType,
    StrategyReasonCode ReasonCode,
    bool AcceptResponseCandidate,
    bool AcceptProposalSetCandidate,
    RegenerationDirective? Regeneration = null,
    PolicyFallbackPlan? Fallback = null);

public sealed record RegenerationDirective(
    ConversationStrategy RequiredStrategy,
    IReadOnlyList<string> RequiredFields,
    IReadOnlySet<Planning.AllowedAssumption> AllowedAssumptions);

public enum PolicyFallbackAction
{
    SafeResponse = 0,
    DeterministicProposal = 1,
}

public sealed record PolicyFallbackPlan(
    PolicyFallbackAction Action,
    ConversationStrategy FailureStrategy);

public enum StrategyDecisionType
{
    Accepted = 0,
    Downgraded = 1,
    Rejected = 2,
    RequiresRegeneration = 3,
}

/// <summary>
/// Stable, logged decision reasons (v3 §12/§15/§23). These are internal observability codes —
/// never shown to the user; downgrades pair with a fallback text from the catalog instead.
/// </summary>
public enum StrategyReasonCode
{
    None = 0,
    StrategyNotInEnvelope = 1,
    ResponseTypeMismatch = 2,
    ExplicitActionIntentRequired = 3,
    EvidenceInvalid = 4,
    ProposalSetMissing = 5,
    ProposalSetInvalid = 6,
    PendingProposalSetAlreadyExists = 7,
    ResponseInvalid = 8,
    UserRejectedAction = 9,
    ClarificationSlotAlreadyAsked = 10,
    ActionableIntentRequiresProposal = 11,
}

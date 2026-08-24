namespace BlotzTask.Modules.AiCoach.Domain.Policy;

/// <summary>
/// Output of the Pre-Policy (v3 tech design §8.1): the safe strategy space for ONE model turn,
/// computed exclusively from committed system facts — never from interpreting the current user
/// message. A broad envelope is deliberate for v1 (§8.3): the envelope itself commits nothing;
/// Post-Policy and the Guards decide what is actually accepted.
/// </summary>
public sealed record StrategyEnvelope(
    string TurnObjective,
    IReadOnlySet<ConversationStrategy> AllowedStrategies,
    IReadOnlySet<string> AllowedCapabilities,
    ResponseConstraints ResponseConstraints,
    ProposalConstraints ProposalConstraints);

public sealed record ResponseConstraints(
    int MaxQuestions,
    int MaxResponseLength);

public sealed record ProposalConstraints(
    int MaxProposals,
    bool RequiresExplicitActionIntent,
    bool ProposalAllowed);

using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Policy;

namespace BlotzTask.Modules.AiCoach.Domain.Modes;

/// <summary>
/// Code-first, versioned mode definition (v3 tech design §17.1). Mode differences live HERE and
/// in the policy tables — never as conditional branches inside the Kernel, the runtime or the
/// transport. A conversation pins its mode at creation; v1 has no runtime mode switching.
/// </summary>
public sealed record AiCoachModeDefinition(
    AiCoachMode Mode,
    string RuleVersion,
    string PromptVersion,
    string ToolsetVersion,
    string MemoryProfileVersion,
    int ModelContractSchemaVersion,
    ConversationPolicyDefinition Policy,
    SupportPolicyDefinition? SupportPolicy,
    ModeTurnObjectives TurnObjectives,
    IReadOnlySet<ConversationPhase> SupportedPhases,
    IReadOnlySet<string> AllowedReadOnlyCapabilities,
    ConversationPersistencePolicy PersistencePolicy)
{
    public ConversationRuntimeVersions ToRuntimeVersions(int protocolVersion) => new(
        RuleVersion,
        Policy.Version,
        PromptVersion,
        ToolsetVersion,
        MemoryProfileVersion,
        protocolVersion,
        ModelContractSchemaVersion,
        SupportPolicy?.Version);
}

public enum ConversationPersistencePolicy
{
    /// <summary>Execution mode: in-memory session, cleared on expiry, not resumed across app sessions.</summary>
    InMemoryOnly = 0,

    /// <summary>Clarify/Companion (future): one active server-side conversation per user.</summary>
    SingleActiveServerConversation = 1,
}

/// <summary>
/// Versioned, testable pure policy configuration (v3 tech design §13.7). Consumed by Pre- and
/// Post-Policy; changing any value requires a new Version.
/// </summary>
public sealed record ConversationPolicyDefinition(
    string Version,
    int MaxQuestionsPerTurn,
    int MaxProposalsPerSet,
    int MaxResponseLength,
    bool AllowsProposalCreation,
    bool AllowsModelProposalSetUpdates,
    bool AllowsPartialProposalConfirmation,
    bool RequireProposalWhenPlanningReady,
    PlanningPolicyDefinition Planning,
    ProposalGenerationPolicy ProposalGeneration);

public sealed record PlanningPolicyDefinition(
    string Version,
    int MaxClarificationAttempts,
    bool AllowConservativeGoalProposal,
    bool AllowCoachDecomposition,
    bool AllowSafeDefaultsWhenClarificationUnavailable,
    ProposalTriggerPolicy ProposalTrigger = ProposalTriggerPolicy.ActionAvailable);

public enum ProposalTriggerPolicy
{
    ActionAvailable = 0,
    ExplicitPlanningRequestOrDelegation = 1,
    CurrentTurnDirectInstruction = 2,
}

public sealed record SupportPolicyDefinition(
    string Version,
    int MaxQuestionsPerTurn,
    int MaxConsecutiveQuestionTurns,
    bool AllowExplicitContinuousExploration);

public sealed record ModeTurnObjectives(
    string Default,
    string ActionPreparing,
    string ReadyForProposal,
    string PendingProposal);

public sealed record ProposalGenerationPolicy(
    string Version,
    int DefaultDurationMinutes,
    int MinimumLeadMinutes,
    int SlotGranularityMinutes,
    TimeOnly WorkingDayStart,
    TimeOnly WorkingDayEnd,
    bool AllowSameDay);

public sealed class ModeDefinitionRegistry
{
    private readonly Dictionary<AiCoachMode, AiCoachModeDefinition> _definitions = [];

    public IReadOnlyCollection<AiCoachModeDefinition> Definitions => _definitions.Values;

    public void Register(AiCoachModeDefinition definition)
    {
        if (!_definitions.TryAdd(definition.Mode, definition))
            throw new InvalidOperationException($"Mode '{definition.Mode}' is registered twice.");
    }

    public AiCoachModeDefinition Get(AiCoachMode mode) =>
        _definitions.TryGetValue(mode, out var definition)
            ? definition
            : throw new InvalidOperationException($"Mode '{mode}' is not registered.");

    public bool IsRegistered(AiCoachMode mode) => _definitions.ContainsKey(mode);
}

file static class SharedPhases
{
    public static readonly IReadOnlySet<ConversationPhase> All = new HashSet<ConversationPhase>
    {
        ConversationPhase.Conversing,
        ConversationPhase.ActionPreparing,
        ConversationPhase.ActionPending,
        ConversationPhase.FollowUp,
        ConversationPhase.Closed,
    };
}

/// <summary>Execution mode definition.</summary>
public static class ExecutionModeDefinition
{
    public static AiCoachModeDefinition Create() => new(
        Mode: AiCoachMode.Execution,
        RuleVersion: "execution-rules-v6",
        PromptVersion: "execution-prompts-v9",
        ToolsetVersion: "execution-toolset-v3",
        MemoryProfileVersion: "execution-memory-v1",
        ModelContractSchemaVersion: 4,
        Policy: new ConversationPolicyDefinition(
            Version: "execution-policy-v4",
            MaxQuestionsPerTurn: 1,
            MaxProposalsPerSet: Proposals.ProposalSet.MaxProposals,
            MaxResponseLength: 1200,
            AllowsProposalCreation: true,
            // Card edits stay a client-local concern in v1 (validated UX): the model discusses
            // the pending card, it never rewrites it.
            AllowsModelProposalSetUpdates: false,
            AllowsPartialProposalConfirmation: true,
            RequireProposalWhenPlanningReady: false,
            Planning: new PlanningPolicyDefinition("execution-planning-v2", 1, true, true, true),
            ProposalGeneration: new ProposalGenerationPolicy(
                "execution-proposal-generation-v2", 30, 15, 15,
                new TimeOnly(8, 0), new TimeOnly(21, 0), true)),
        SupportPolicy: null,
        TurnObjectives: new ModeTurnObjectives(
            "Turn the user's concrete actions or safe low-risk goal into an editable draft proposal.",
            "Use the user's answer and verified planning context; do not repeat a spent clarification topic.",
            "Generate a conservative draft proposal from the verified planning intent.",
            "Discuss the current draft without creating a second one."),
        SupportedPhases: SharedPhases.All,
        AllowedReadOnlyCapabilities: new HashSet<string>(),
        PersistencePolicy: ConversationPersistencePolicy.InMemoryOnly);
}

/// <summary>
/// NOT registered in v1 — no prompt profile ships for it yet. The definition exists so the pure
/// Post-Policy mode boundaries (v3 §24.1) are table-tested before the mode ever goes live.
/// </summary>
public static class ClarifyModeDefinition
{
    public static AiCoachModeDefinition Create() => new(
        Mode: AiCoachMode.Clarify,
        RuleVersion: "clarify-rules-v0",
        PromptVersion: "clarify-prompts-v0",
        ToolsetVersion: "clarify-toolset-v0",
        MemoryProfileVersion: "clarify-memory-v0",
        ModelContractSchemaVersion: 4,
        Policy: new ConversationPolicyDefinition(
            Version: "clarify-policy-v0",
            MaxQuestionsPerTurn: 1,
            MaxProposalsPerSet: Proposals.ProposalSet.MaxProposals,
            MaxResponseLength: 1200,
            AllowsProposalCreation: true,
            AllowsModelProposalSetUpdates: false,
            AllowsPartialProposalConfirmation: true,
            RequireProposalWhenPlanningReady: false,
            Planning: new PlanningPolicyDefinition("clarify-planning-v1", 1, false, true, true),
            ProposalGeneration: new ProposalGenerationPolicy(
                "clarify-proposal-generation-v1", 30, 15, 15,
                new TimeOnly(8, 0), new TimeOnly(21, 0), true)),
        SupportPolicy: null,
        TurnObjectives: new ModeTurnObjectives(
            "Help the user clarify what matters without assuming action authorization.",
            "Use the user's answer to refine the active planning intent.",
            "Offer a proposal only when the Clarify trigger is explicitly satisfied.",
            "Discuss the current draft without creating a second one."),
        SupportedPhases: SharedPhases.All,
        AllowedReadOnlyCapabilities: new HashSet<string>(),
        PersistencePolicy: ConversationPersistencePolicy.SingleActiveServerConversation);
}

/// <summary>
/// Companion listens by default; only an explicit direct instruction in the CURRENT message
/// may create a Pending ProposalSet (v3 §13.4), and even then a formal task still requires the
/// user's confirm.
/// </summary>
public static class CompanionModeDefinition
{
    public static AiCoachModeDefinition Create() => new(
        Mode: AiCoachMode.Companion,
        RuleVersion: "companion-rules-v3",
        PromptVersion: "companion-prompts-v3",
        ToolsetVersion: "companion-toolset-v1",
        MemoryProfileVersion: "companion-memory-v1",
        ModelContractSchemaVersion: 4,
        Policy: new ConversationPolicyDefinition(
            Version: "companion-policy-v2",
            MaxQuestionsPerTurn: 1,
            MaxProposalsPerSet: Proposals.ProposalSet.MaxProposals,
            MaxResponseLength: 1200,
            AllowsProposalCreation: true,
            AllowsModelProposalSetUpdates: false,
            AllowsPartialProposalConfirmation: true,
            RequireProposalWhenPlanningReady: false,
            Planning: new PlanningPolicyDefinition(
                "companion-planning-v3", 1, false, false, false,
                ProposalTriggerPolicy.CurrentTurnDirectInstruction),
            ProposalGeneration: new ProposalGenerationPolicy(
                "execution-proposal-generation-v2", 30, 15, 15,
                new TimeOnly(8, 0), new TimeOnly(21, 0), true)),
        SupportPolicy: new SupportPolicyDefinition(
            "companion-support-v2", 1, 1, AllowExplicitContinuousExploration: true),
        TurnObjectives: new ModeTurnObjectives(
            "Respond to the user's current expression and respect their requested support style.",
            "Clarify only the concrete action requested by the user; do not turn ordinary support into planning.",
            "A proposal is permitted only for a verified direct instruction in the current turn.",
            "Support the user while discussing the current draft; do not create a second one."),
        SupportedPhases: SharedPhases.All,
        AllowedReadOnlyCapabilities: new HashSet<string>(),
        PersistencePolicy: ConversationPersistencePolicy.InMemoryOnly);
}

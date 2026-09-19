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
    PlanningPolicyDefinition Planning,
    ProposalGenerationPolicy ProposalGeneration);

public sealed record PlanningPolicyDefinition(
    string Version,
    int MaxClarificationAttempts,
    bool AllowConservativeGoalProposal,
    bool AllowCoachDecomposition,
    bool AllowSafeDefaultsWhenClarificationUnavailable,
    ProposalTriggerPolicy ProposalTrigger = ProposalTriggerPolicy.ActionAvailable,
    DraftContextPolicy DraftContext = DraftContextPolicy.ExplicitTriggerOnly,
    ClarificationExhaustionBehavior ClarificationExhaustion =
        ClarificationExhaustionBehavior.StopWithoutProposal);

public enum DraftContextPolicy
{
    ExplicitTriggerOnly = 0,
    TargetScopeAndGrounding = 1,
}

public enum ClarificationExhaustionBehavior
{
    StopWithoutProposal = 0,
    RequireTentativeProposal = 1,
}

public enum ProposalTriggerPolicy
{
    ActionAvailable = 0,
    ExplicitPlanningRequestOrDelegation = 1,
    CurrentTurnDirectInstruction = 2,
}

public sealed record SupportPolicyDefinition(
    string Version,
    int MaxQuestionsPerTurn,
    int PreferredConsecutiveQuestionTurns);

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
        RuleVersion: "execution-rules-v8",
        PromptVersion: "execution-prompts-v11",
        ToolsetVersion: "execution-toolset-v3",
        MemoryProfileVersion: "execution-memory-v1",
        ModelContractSchemaVersion: 6,
        Policy: new ConversationPolicyDefinition(
            Version: "execution-policy-v6",
            MaxQuestionsPerTurn: 1,
            MaxProposalsPerSet: Proposals.ProposalSet.MaxProposals,
            MaxResponseLength: 1200,
            AllowsProposalCreation: true,
            AllowsModelProposalSetUpdates: true,
            AllowsPartialProposalConfirmation: true,
            Planning: new PlanningPolicyDefinition("execution-planning-v3", 1, true, true, true),
            ProposalGeneration: new ProposalGenerationPolicy(
                "execution-proposal-generation-v2", 30, 15, 15,
                new TimeOnly(8, 0), new TimeOnly(21, 0), true)),
        SupportPolicy: null,
        TurnObjectives: new ModeTurnObjectives(
            "Respond to the current request; offer an editable draft when it helps requested planning.",
            "Use the user's answer and verified planning context; do not repeat a spent clarification topic.",
            "Generate a conservative draft proposal from the verified planning intent.",
            "Discuss the current draft without creating a second one."),
        SupportedPhases: SharedPhases.All,
        AllowedReadOnlyCapabilities: new HashSet<string>(),
        PersistencePolicy: ConversationPersistencePolicy.InMemoryOnly);
}

/// <summary>
/// Clarify mode definition. It shares the in-memory conversation lifetime used by Execution.
/// </summary>
public static class ClarifyModeDefinition
{
    public static AiCoachModeDefinition Create() => new(
        Mode: AiCoachMode.Clarify,
        RuleVersion: "clarification-rules-v4",
        PromptVersion: "clarify-prompts-v4",
        ToolsetVersion: "clarification-toolset-v1",
        MemoryProfileVersion: "clarification-memory-v1",
        ModelContractSchemaVersion: 6,
        Policy: new ConversationPolicyDefinition(
            Version: "clarification-policy-v4",
            MaxQuestionsPerTurn: 1,
            MaxProposalsPerSet: Proposals.ProposalSet.MaxProposals,
            MaxResponseLength: 1200,
            AllowsProposalCreation: true,
            AllowsModelProposalSetUpdates: true,
            AllowsPartialProposalConfirmation: true,
            Planning: new PlanningPolicyDefinition(
                "clarification-planning-v3", 2, false, true, false,
                ProposalTriggerPolicy.ExplicitPlanningRequestOrDelegation,
                DraftContextPolicy.TargetScopeAndGrounding,
                ClarificationExhaustionBehavior.RequireTentativeProposal),
            ProposalGeneration: new ProposalGenerationPolicy(
                "execution-proposal-generation-v2", 30, 15, 15,
                new TimeOnly(8, 0), new TimeOnly(21, 0), true)),
        SupportPolicy: null,
        TurnObjectives: new ModeTurnObjectives(
            "Help the user clarify what matters and provide a tentative draft once goal, current state, and topic are known.",
            "Use the user's answer to refine the active planning intent; follow the planning directive when clarification is exhausted.",
            "Offer an editable, pending proposal whenever the planning directive permits or requires one.",
            "Discuss the current draft without creating a second one."),
        SupportedPhases: SharedPhases.All,
        AllowedReadOnlyCapabilities: new HashSet<string>(),
        PersistencePolicy: ConversationPersistencePolicy.InMemoryOnly);
}

/// <summary>
/// Companion listens by default. A verified planning request may create an editable Pending
/// ProposalSet; a formal task still requires the user's separate confirmation.
/// </summary>
public static class CompanionModeDefinition
{
    public static AiCoachModeDefinition Create() => new(
        Mode: AiCoachMode.Companion,
        RuleVersion: "companion-rules-v8",
        PromptVersion: "companion-prompts-v8",
        ToolsetVersion: "companion-toolset-v1",
        MemoryProfileVersion: "companion-memory-v1",
        ModelContractSchemaVersion: 6,
        Policy: new ConversationPolicyDefinition(
            Version: "companion-policy-v8",
            MaxQuestionsPerTurn: 1,
            MaxProposalsPerSet: Proposals.ProposalSet.MaxProposals,
            MaxResponseLength: 1200,
            AllowsProposalCreation: true,
            AllowsModelProposalSetUpdates: true,
            AllowsPartialProposalConfirmation: true,
            Planning: new PlanningPolicyDefinition(
                "companion-planning-v7", int.MaxValue, false, true, false,
                ProposalTriggerPolicy.ExplicitPlanningRequestOrDelegation),
            ProposalGeneration: new ProposalGenerationPolicy(
                "execution-proposal-generation-v2", 30, 15, 15,
                new TimeOnly(8, 0), new TimeOnly(21, 0), true)),
        SupportPolicy: new SupportPolicyDefinition(
            "companion-support-v5", 1, 1),
        TurnObjectives: new ModeTurnObjectives(
            "Respond to the user's current expression and respect their requested support style.",
            "Clarify only the concrete action requested by the user; do not turn ordinary support into planning.",
            "A proposal is permitted for a validated planning request with a current action or active retained intent.",
            "Support the user while discussing the current open draft; do not create another one."),
        SupportedPhases: SharedPhases.All,
        AllowedReadOnlyCapabilities: new HashSet<string>(),
        PersistencePolicy: ConversationPersistencePolicy.InMemoryOnly);
}

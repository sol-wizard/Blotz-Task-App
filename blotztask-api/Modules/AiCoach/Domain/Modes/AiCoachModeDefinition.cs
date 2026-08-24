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
    ConversationPolicyDefinition Policy,
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
        protocolVersion);
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
    bool RequiresExplicitActionIntentForProposal,
    bool AllowsProposalCreation,
    bool AllowsModelProposalSetUpdates,
    bool AllowsPartialProposalConfirmation);

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

/// <summary>The only mode registered (and reachable through the API) in v1.</summary>
public static class ExecutionModeDefinition
{
    public static AiCoachModeDefinition Create() => new(
        Mode: AiCoachMode.Execution,
        RuleVersion: "execution-rules-v3",
        PromptVersion: "execution-prompts-v6",
        ToolsetVersion: "execution-toolset-v3",
        MemoryProfileVersion: "execution-memory-v1",
        Policy: new ConversationPolicyDefinition(
            Version: "execution-policy-v1",
            MaxQuestionsPerTurn: 1,
            MaxProposalsPerSet: Proposals.ProposalSet.MaxProposals,
            MaxResponseLength: 1200,
            RequiresExplicitActionIntentForProposal: true,
            AllowsProposalCreation: true,
            // Card edits stay a client-local concern in v1 (validated UX): the model discusses
            // the pending card, it never rewrites it.
            AllowsModelProposalSetUpdates: false,
            AllowsPartialProposalConfirmation: true),
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
        Policy: new ConversationPolicyDefinition(
            Version: "clarify-policy-v0",
            MaxQuestionsPerTurn: 1,
            MaxProposalsPerSet: Proposals.ProposalSet.MaxProposals,
            MaxResponseLength: 1200,
            RequiresExplicitActionIntentForProposal: true,
            AllowsProposalCreation: true,
            AllowsModelProposalSetUpdates: false,
            AllowsPartialProposalConfirmation: true),
        SupportedPhases: SharedPhases.All,
        AllowedReadOnlyCapabilities: new HashSet<string>(),
        PersistencePolicy: ConversationPersistencePolicy.SingleActiveServerConversation);
}

/// <summary>
/// NOT registered in v1 (see <see cref="ClarifyModeDefinition"/>). Companion listens by
/// default; only an explicit direct instruction in the CURRENT message may create a Pending
/// ProposalSet (v3 §13.4), and even then a formal task still requires the user's confirm.
/// </summary>
public static class CompanionModeDefinition
{
    public static AiCoachModeDefinition Create() => new(
        Mode: AiCoachMode.Companion,
        RuleVersion: "companion-rules-v0",
        PromptVersion: "companion-prompts-v0",
        ToolsetVersion: "companion-toolset-v0",
        MemoryProfileVersion: "companion-memory-v0",
        Policy: new ConversationPolicyDefinition(
            Version: "companion-policy-v0",
            MaxQuestionsPerTurn: 1,
            MaxProposalsPerSet: Proposals.ProposalSet.MaxProposals,
            MaxResponseLength: 1200,
            RequiresExplicitActionIntentForProposal: true,
            AllowsProposalCreation: true,
            AllowsModelProposalSetUpdates: false,
            AllowsPartialProposalConfirmation: true),
        SupportedPhases: SharedPhases.All,
        AllowedReadOnlyCapabilities: new HashSet<string>(),
        PersistencePolicy: ConversationPersistencePolicy.SingleActiveServerConversation);
}

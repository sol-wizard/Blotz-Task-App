using BlotzTask.Modules.AiCoach.Domain.Capabilities;
using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Domain.Modes;

/// <summary>
/// Declarative mode policy (tech design §13). All three modes share the Conversation Kernel;
/// only their definitions differ. V1 registers Execution only, but every surface that consumes
/// definitions goes through <see cref="ModeDefinitionRegistry"/> so Clarify/Companion slot in
/// without kernel changes.
///
/// Note (§13): only Model Capabilities live in <see cref="Capabilities"/>. Conversation actions
/// (e.g. NextTaskRequested) and memory sources are NOT capabilities and are handled by the
/// conversation API / memory pipeline respectively.
/// </summary>
public sealed record AiCoachModeDefinition(
    AiCoachMode Mode,
    string RuleVersion,
    string PromptVersion,
    string ToolsetVersion,
    int ExecutionFrameVersion,
    ConversationPersistencePolicy PersistencePolicy,
    MemoryProfile MemoryProfile,
    IReadOnlySet<CapabilityId> Capabilities,
    IReadOnlySet<ConversationState> SupportedStates);

public enum ConversationPersistencePolicy
{
    /// <summary>Execution mode: in-memory session, cleared on expiry, not resumed across app sessions.</summary>
    InMemoryOnly = 0,

    /// <summary>Clarify/Companion (v2): one active server-side conversation per user.</summary>
    SingleActiveServerConversation = 1,
}

/// <summary>Minimal v1 memory profile (tech design §20.5): recent turns only for Execution mode.</summary>
public sealed record MemoryProfile(
    string Id,
    int Version,
    int RecentTurnLimit);

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

public static class ExecutionModeDefinition
{
    public static AiCoachModeDefinition Create() => new(
        Mode: AiCoachMode.Execution,
        RuleVersion: "execution-rules-v2",
        PromptVersion: "execution-prompts-v5",
        ToolsetVersion: "execution-toolset-v2",
        ExecutionFrameVersion: 2,
        PersistencePolicy: ConversationPersistencePolicy.InMemoryOnly,
        MemoryProfile: new MemoryProfile("execution-memory", 1, Conversation.RecentTurnLimit),
        Capabilities: new HashSet<CapabilityId> { CapabilityId.DraftOneOffCreate },
        SupportedStates: new HashSet<ConversationState>
        {
            ConversationState.Conversing,
            ConversationState.Clarifying,
            ConversationState.DraftPending,
            ConversationState.DraftHandled,
            ConversationState.Closed,
        });
}

using BlotzTask.Modules.AiCoach.Capabilities;
using BlotzTask.Modules.AiCoach.Domain;
using BlotzTask.Modules.AiCoach.StateMachine;

namespace BlotzTask.Modules.AiCoach.Modes;

public enum ConversationPersistencePolicy { ShortLived, SingleActivePerMode }
public sealed record MemoryProfileDefinition(string Id, int Version, int RecentTurnLimit);

public interface IModeTransitionPolicy
{
    IReadOnlySet<ConversationState> SupportedStates { get; }
    bool Allows(ConversationState state, Type eventType);
}

public sealed class ModeTransitionPolicy(
    IReadOnlySet<ConversationState> supportedStates,
    IReadOnlyDictionary<Type, IReadOnlySet<ConversationState>> eventStates) : IModeTransitionPolicy
{
    public IReadOnlySet<ConversationState> SupportedStates => supportedStates;
    public bool Allows(ConversationState state, Type eventType) =>
        supportedStates.Contains(state)
        && eventStates.TryGetValue(eventType, out var states)
        && states.Contains(state);
}

public sealed record AiCoachModeDefinition(
    AiCoachMode Mode, string RuleVersion, string PromptVersion,
    string ModelDeploymentPolicyVersion, int ExecutionFrameVersion,
    string ToolsetVersion, int SummarySchemaVersion,
    MemoryProfileDefinition MemoryProfile,
    ConversationPersistencePolicy PersistencePolicy,
    TimeSpan? Lifetime,
    string? ActiveConversationSlot,
    IReadOnlySet<CapabilityId> Capabilities,
    IModeTransitionPolicy TransitionPolicy);

public interface IAiCoachModeDefinitionProvider { AiCoachModeDefinition Definition { get; } }

public interface IAiCoachFoundationVersionRegistry
{
    void EnsureRegistered(AiCoachModeDefinition definition);
}

public sealed class AiCoachFoundationVersionRegistry : IAiCoachFoundationVersionRegistry
{
    private static readonly IReadOnlySet<string> RuleVersions = new HashSet<string> { "rule-foundation-v1" };
    private static readonly IReadOnlySet<string> PromptVersions = new HashSet<string> { "prompt-foundation-v1" };
    private static readonly IReadOnlySet<string> ModelPolicyVersions = new HashSet<string> { "model-policy-foundation-v1" };
    private static readonly IReadOnlySet<string> ToolsetVersions = new HashSet<string> { "toolset-foundation-v1" };
    private static readonly IReadOnlySet<int> ExecutionFrameVersions = new HashSet<int> { 1 };
    private static readonly IReadOnlySet<int> SummarySchemaVersions = new HashSet<int> { 1 };

    public void EnsureRegistered(AiCoachModeDefinition definition)
    {
        if (!RuleVersions.Contains(definition.RuleVersion)
            || !PromptVersions.Contains(definition.PromptVersion)
            || !ModelPolicyVersions.Contains(definition.ModelDeploymentPolicyVersion)
            || !ToolsetVersions.Contains(definition.ToolsetVersion)
            || !ExecutionFrameVersions.Contains(definition.ExecutionFrameVersion)
            || !SummarySchemaVersions.Contains(definition.SummarySchemaVersion))
            throw new InvalidOperationException($"Mode '{definition.Mode}' references an unregistered foundation version.");
    }
}

internal static class FoundationModePolicies
{
    public static readonly IReadOnlySet<ConversationState> ExecuteStates = new HashSet<ConversationState>
    {
        ConversationState.Idle, ConversationState.Conversing, ConversationState.Clarifying,
        ConversationState.DraftPending, ConversationState.DraftHandled,
        ConversationState.AwaitingIntegrationChoice, ConversationState.AwaitingNextChoice,
        ConversationState.Closed
    };

    public static IModeTransitionPolicy Create(IReadOnlySet<ConversationState> states) =>
        new ModeTransitionPolicy(states, new Dictionary<Type, IReadOnlySet<ConversationState>>
        {
            [typeof(UserMessageReceived)] = states.Where(state => state is ConversationState.Idle
                or ConversationState.Conversing or ConversationState.Clarifying).ToHashSet(),
            [typeof(ConversationExpired)] = states.Where(state => state != ConversationState.Closed).ToHashSet()
        });
}

public sealed class ExecuteModeDefinitionProvider : IAiCoachModeDefinitionProvider
{
    public AiCoachModeDefinition Definition { get; } = new(
        AiCoachMode.Execute, "rule-foundation-v1", "prompt-foundation-v1",
        "model-policy-foundation-v1", 1, "toolset-foundation-v1", 1,
        new MemoryProfileDefinition("execute-v1", 1, 20),
        ConversationPersistencePolicy.ShortLived, TimeSpan.FromHours(24), null,
        new HashSet<CapabilityId>
        {
            CapabilityIds.CreateOneOffDraft, CapabilityIds.UpdateArtifact,
            CapabilityIds.RejectArtifact, CapabilityIds.PersistTask
        }, FoundationModePolicies.Create(FoundationModePolicies.ExecuteStates));
}

public sealed class ClarifyModeDefinitionProvider : IAiCoachModeDefinitionProvider
{
    private static readonly IReadOnlySet<ConversationState> States = new HashSet<ConversationState>
    {
        ConversationState.Idle, ConversationState.Conversing, ConversationState.Clarifying,
        ConversationState.AwaitingSuggestionConfirmation, ConversationState.DraftPending,
        ConversationState.DraftHandled, ConversationState.AwaitingNextChoice, ConversationState.Closed
    };
    public AiCoachModeDefinition Definition { get; } = new(
        AiCoachMode.Clarify, "rule-foundation-v1", "prompt-foundation-v1",
        "model-policy-foundation-v1", 1, "toolset-foundation-v1", 1,
        new MemoryProfileDefinition("clarify-v1", 1, 20),
        ConversationPersistencePolicy.SingleActivePerMode, null, "clarify",
        new HashSet<CapabilityId>(), FoundationModePolicies.Create(States));
}

public sealed class CompanionModeDefinitionProvider : IAiCoachModeDefinitionProvider
{
    private static readonly IReadOnlySet<ConversationState> States = new HashSet<ConversationState>
    {
        ConversationState.Idle, ConversationState.Conversing, ConversationState.Clarifying,
        ConversationState.DraftPending, ConversationState.DraftHandled, ConversationState.Closed
    };
    public AiCoachModeDefinition Definition { get; } = new(
        AiCoachMode.Companion, "rule-foundation-v1", "prompt-foundation-v1",
        "model-policy-foundation-v1", 1, "toolset-foundation-v1", 1,
        new MemoryProfileDefinition("companion-v1", 1, 20),
        ConversationPersistencePolicy.SingleActivePerMode, null, "companion",
        new HashSet<CapabilityId>(), FoundationModePolicies.Create(States));
}

public interface IAiCoachModeRegistry
{
    AiCoachModeDefinition Get(AiCoachMode mode);
    IReadOnlyCollection<AiCoachModeDefinition> All { get; }
}

public sealed class AiCoachModeRegistry(IEnumerable<IAiCoachModeDefinitionProvider> providers) : IAiCoachModeRegistry
{
    private readonly IReadOnlyDictionary<AiCoachMode, AiCoachModeDefinition> _definitions = Build(providers);
    public IReadOnlyCollection<AiCoachModeDefinition> All => _definitions.Values.ToArray();
    public AiCoachModeDefinition Get(AiCoachMode mode) =>
        _definitions.TryGetValue(mode, out var definition)
            ? definition
            : throw new ArgumentOutOfRangeException(nameof(mode), mode, "Unsupported AI Coach mode.");

    private static IReadOnlyDictionary<AiCoachMode, AiCoachModeDefinition> Build(
        IEnumerable<IAiCoachModeDefinitionProvider> providers)
    {
        var definitions = providers.Select(provider => provider.Definition).ToArray();
        var duplicate = definitions.GroupBy(definition => definition.Mode).FirstOrDefault(group => group.Count() > 1);
        if (duplicate is not null)
            throw new InvalidOperationException($"Mode '{duplicate.Key}' is registered more than once.");
        return definitions.ToDictionary(definition => definition.Mode);
    }
}

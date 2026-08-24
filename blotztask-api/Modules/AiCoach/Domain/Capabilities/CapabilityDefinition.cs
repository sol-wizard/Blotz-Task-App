using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Domain.Capabilities;

/// <summary>Namespaced capability identifier, e.g. <c>draft.one_off.create</c> (tech design §14).</summary>
public readonly record struct CapabilityId(string Value)
{
    public override string ToString() => Value;

    public static readonly CapabilityId DraftOneOffCreate = new("draft.one_off.create");
}

public enum CapabilityInvoker
{
    Model = 0,
    UserCommand = 1,
    System = 2,
    RecoveryWorker = 3,
}

public enum ConsentRequirement
{
    None = 0,
    ExplicitUserCommand = 1,
}

/// <summary>Constrains what a capability handler may produce (tech design §14/§21.8).</summary>
public enum CapabilityExecutionSemantics
{
    ReadOnly = 0,
    ProposesArtifact = 1,
    ExternalEffect = 2,
}

public enum CapabilityConcurrencyPolicy
{
    SequentialOnly = 0,
    ParallelSafe = 1,
}

/// <summary>
/// The single canonical capability definition (tech design §14). Model tools are merely the
/// projection of capabilities whose <see cref="AllowedInvokers"/> contains
/// <see cref="CapabilityInvoker.Model"/>.
/// </summary>
public sealed record CapabilityDefinition(
    CapabilityId Id,
    int CapabilityVersion,
    int InputSchemaVersion,
    int OutputSchemaVersion,
    IReadOnlySet<CapabilityInvoker> AllowedInvokers,
    IReadOnlySet<AiCoachMode> AllowedModes,
    IReadOnlySet<ConversationState> AllowedStates,
    IReadOnlySet<ArtifactType> AllowedCurrentArtifacts,
    ConsentRequirement ConsentRequirement,
    CapabilityExecutionSemantics ExecutionSemantics,
    CapabilityConcurrencyPolicy ConcurrencyPolicy,
    string ToolName,
    string ToolDescription,
    Type InputType,
    Type HandlerType);

using BlotzTask.Modules.AiCoach.Domain;
using BlotzTask.Modules.AiCoach.Modes;

namespace BlotzTask.Modules.AiCoach.Capabilities;

public readonly record struct CapabilityId(string Value) { public override string ToString() => Value; }
public static class CapabilityIds
{
    public static readonly CapabilityId CreateOneOffDraft = new("draft.one_off.create");
    public static readonly CapabilityId UpdateArtifact = new("artifact.update");
    public static readonly CapabilityId RejectArtifact = new("artifact.reject");
    public static readonly CapabilityId PersistTask = new("task.persist");
}

public enum CapabilityInvoker { Model, UserCommand, System, RecoveryWorker }
public enum ConsentRequirement { None, ModePolicy, VerifiedUserCommand }
public enum CapabilityExecutionSemantics { ReadOnly, ProposesArtifact, ExternalEffect }
public enum CapabilityConcurrencyPolicy { SequentialOnly, ParallelSafe }
public enum CurrentArtifactRequirement { RequiresNone, AllowsAny, RequiresTypes }

public sealed record CapabilityDefinition(
    CapabilityId Id, int CapabilityVersion, int InputSchemaVersion, int OutputSchemaVersion,
    IReadOnlySet<CapabilityInvoker> AllowedInvokers,
    IReadOnlySet<AiCoachMode> AllowedModes,
    IReadOnlySet<ConversationState> AllowedStates,
    CurrentArtifactRequirement ArtifactRequirement,
    IReadOnlySet<ArtifactType> RequiredArtifactTypes,
    ConsentRequirement ConsentRequirement,
    CapabilityExecutionSemantics ExecutionSemantics,
    CapabilityConcurrencyPolicy ConcurrencyPolicy,
    Type InputType, Type OutputType, Type HandlerType);

public sealed record CreateOneOffDraftCapabilityInput(string Title, string? Description,
    DateTimeOffset StartTimeUtc, DateTimeOffset EndTimeUtc, string TimeZoneId);
public sealed record CreateOneOffDraftCapabilityOutput(Guid ArtifactId);
public sealed record UpdateArtifactCapabilityInput(Guid ArtifactId, int ExpectedVersion);
public sealed record UpdateArtifactCapabilityOutput(Guid ArtifactId, int Version);
public sealed record RejectArtifactCapabilityInput(Guid ArtifactId, int ExpectedVersion);
public sealed record RejectArtifactCapabilityOutput(Guid ArtifactId);
public sealed record PersistTaskCapabilityInput(Guid ArtifactId, int ExpectedVersion, Guid CommandId);
public sealed record PersistTaskCapabilityOutput(int TaskId);

public interface ICapabilityHandler
{
    Type InputType { get; }
    Type OutputType { get; }
    Task<object> HandleAsync(object input, CancellationToken cancellationToken);
}

public interface ICapabilityHandler<in TInput, TOutput> : ICapabilityHandler
{
    Task<TOutput> HandleAsync(TInput input, CancellationToken cancellationToken);
}

public abstract class CapabilityHandler<TInput, TOutput> : ICapabilityHandler<TInput, TOutput>
{
    public Type InputType => typeof(TInput);
    public Type OutputType => typeof(TOutput);
    public abstract Task<TOutput> HandleAsync(TInput input, CancellationToken cancellationToken);
    async Task<object> ICapabilityHandler.HandleAsync(object input, CancellationToken cancellationToken) =>
        await HandleAsync((TInput)input, cancellationToken) ?? throw new InvalidOperationException("Capability returned null.");
}

// P1.5 registers real handler types so registry validation is meaningful, while deliberately
// refusing execution until the corresponding P2 application workflow is implemented.
public sealed class FoundationCapabilityHandler<TInput, TOutput> : CapabilityHandler<TInput, TOutput>
{
    public override Task<TOutput> HandleAsync(TInput input, CancellationToken cancellationToken) =>
        throw new NotSupportedException("This capability is registered for schema/toolset validation only in P1.5.");
}

public interface ICapabilityDefinitionProvider { CapabilityDefinition Definition { get; } }

public sealed class FoundationCapabilityDefinitions : ICapabilityDefinitionProvider
{
    private readonly CapabilityDefinition _definition;
    public FoundationCapabilityDefinitions(CapabilityDefinition definition) => _definition = definition;
    public CapabilityDefinition Definition => _definition;

    public static IReadOnlyList<CapabilityDefinition> Create() =>
    [
        Define<CreateOneOffDraftCapabilityInput, CreateOneOffDraftCapabilityOutput>(
            CapabilityIds.CreateOneOffDraft, new HashSet<CapabilityInvoker> { CapabilityInvoker.Model },
            new HashSet<AiCoachMode> { AiCoachMode.Execute },
            new HashSet<ConversationState> { ConversationState.Conversing, ConversationState.Clarifying },
            CurrentArtifactRequirement.RequiresNone, new HashSet<ArtifactType>(),
            ConsentRequirement.ModePolicy, CapabilityExecutionSemantics.ProposesArtifact),
        Define<UpdateArtifactCapabilityInput, UpdateArtifactCapabilityOutput>(
            CapabilityIds.UpdateArtifact, new HashSet<CapabilityInvoker> { CapabilityInvoker.UserCommand },
            new HashSet<AiCoachMode> { AiCoachMode.Execute },
            new HashSet<ConversationState> { ConversationState.DraftPending },
            CurrentArtifactRequirement.RequiresTypes, new HashSet<ArtifactType> { ArtifactType.TaskDraft },
            ConsentRequirement.VerifiedUserCommand, CapabilityExecutionSemantics.ProposesArtifact),
        Define<RejectArtifactCapabilityInput, RejectArtifactCapabilityOutput>(
            CapabilityIds.RejectArtifact, new HashSet<CapabilityInvoker> { CapabilityInvoker.UserCommand },
            new HashSet<AiCoachMode> { AiCoachMode.Execute },
            new HashSet<ConversationState> { ConversationState.DraftPending },
            CurrentArtifactRequirement.RequiresTypes, new HashSet<ArtifactType> { ArtifactType.TaskDraft },
            ConsentRequirement.VerifiedUserCommand, CapabilityExecutionSemantics.ProposesArtifact),
        Define<PersistTaskCapabilityInput, PersistTaskCapabilityOutput>(
            CapabilityIds.PersistTask, new HashSet<CapabilityInvoker> { CapabilityInvoker.UserCommand },
            new HashSet<AiCoachMode> { AiCoachMode.Execute },
            new HashSet<ConversationState> { ConversationState.DraftPending },
            CurrentArtifactRequirement.RequiresTypes, new HashSet<ArtifactType> { ArtifactType.TaskDraft },
            ConsentRequirement.VerifiedUserCommand, CapabilityExecutionSemantics.ExternalEffect)
    ];

    private static CapabilityDefinition Define<TInput, TOutput>(
        CapabilityId id, IReadOnlySet<CapabilityInvoker> invokers, IReadOnlySet<AiCoachMode> modes,
        IReadOnlySet<ConversationState> states, CurrentArtifactRequirement artifactRequirement,
        IReadOnlySet<ArtifactType> artifactTypes, ConsentRequirement consent,
        CapabilityExecutionSemantics semantics) =>
        new(id, 1, 1, 1, invokers, modes, states, artifactRequirement, artifactTypes, consent, semantics,
            CapabilityConcurrencyPolicy.SequentialOnly, typeof(TInput), typeof(TOutput),
            typeof(FoundationCapabilityHandler<TInput, TOutput>));
}

public interface ICapabilityRegistry
{
    CapabilityDefinition Get(CapabilityId id);
    IReadOnlyCollection<CapabilityDefinition> All { get; }
    IReadOnlyList<CapabilityDefinition> GetModelCapabilities(
        AiCoachModeDefinition mode, ConversationState state, ArtifactType? currentArtifactType);
}

public sealed class CapabilityRegistry(IEnumerable<ICapabilityDefinitionProvider> providers) : ICapabilityRegistry
{
    private readonly IReadOnlyDictionary<CapabilityId, CapabilityDefinition> _definitions = Build(providers);
    public IReadOnlyCollection<CapabilityDefinition> All => _definitions.Values.ToArray();
    public CapabilityDefinition Get(CapabilityId id) => _definitions.TryGetValue(id, out var definition)
        ? definition : throw new KeyNotFoundException($"Capability '{id}' is not registered.");

    public IReadOnlyList<CapabilityDefinition> GetModelCapabilities(
        AiCoachModeDefinition mode, ConversationState state, ArtifactType? currentArtifactType) =>
        _definitions.Values
            .Where(definition => mode.Capabilities.Contains(definition.Id))
            .Where(definition => definition.AllowedInvokers.Contains(CapabilityInvoker.Model))
            .Where(definition => definition.AllowedModes.Contains(mode.Mode))
            .Where(definition => definition.AllowedStates.Contains(state))
            .Where(definition => ArtifactMatches(definition, currentArtifactType))
            .OrderBy(definition => definition.Id.Value, StringComparer.Ordinal).ToArray();

    internal static bool ArtifactMatches(CapabilityDefinition definition, ArtifactType? current) =>
        definition.ArtifactRequirement switch
        {
            CurrentArtifactRequirement.RequiresNone => current is null,
            CurrentArtifactRequirement.AllowsAny => true,
            CurrentArtifactRequirement.RequiresTypes => current is not null
                && definition.RequiredArtifactTypes.Contains(current.Value),
            _ => false
        };

    private static IReadOnlyDictionary<CapabilityId, CapabilityDefinition> Build(
        IEnumerable<ICapabilityDefinitionProvider> providers)
    {
        var definitions = providers.Select(provider => provider.Definition).ToArray();
        var duplicate = definitions.GroupBy(definition => definition.Id).FirstOrDefault(group => group.Count() > 1);
        if (duplicate is not null) throw new InvalidOperationException($"Capability '{duplicate.Key}' is registered more than once.");
        foreach (var definition in definitions)
        {
            if (!typeof(ICapabilityHandler).IsAssignableFrom(definition.HandlerType))
                throw new InvalidOperationException($"Capability '{definition.Id}' has an invalid handler type.");
            if (definition.ExecutionSemantics == CapabilityExecutionSemantics.ExternalEffect
                && definition.AllowedInvokers.Contains(CapabilityInvoker.Model))
                throw new InvalidOperationException($"External effect capability '{definition.Id}' cannot be exposed to the model.");
            if (definition.ExecutionSemantics is CapabilityExecutionSemantics.ProposesArtifact
                    or CapabilityExecutionSemantics.ExternalEffect
                && definition.ConcurrencyPolicy != CapabilityConcurrencyPolicy.SequentialOnly)
                throw new InvalidOperationException($"Mutating capability '{definition.Id}' must execute sequentially.");
            if (definition.ArtifactRequirement == CurrentArtifactRequirement.RequiresTypes
                && definition.RequiredArtifactTypes.Count == 0)
                throw new InvalidOperationException($"Capability '{definition.Id}' requires artifact types but declares none.");
        }
        return definitions.ToDictionary(definition => definition.Id);
    }
}

public sealed record CapabilityInvocationContext(
    CapabilityInvoker Invoker, AiCoachModeDefinition Mode, ConversationState State,
    ArtifactType? CurrentArtifactType, bool HasVerifiedUserConsent);

public interface ICapabilityDispatcher
{
    Task<object> DispatchAsync(CapabilityId id, object input, CapabilityInvocationContext context,
        CancellationToken cancellationToken);
}

public sealed class CapabilityDispatcher(ICapabilityRegistry registry, IServiceProvider services)
    : ICapabilityDispatcher
{
    public async Task<object> DispatchAsync(CapabilityId id, object input, CapabilityInvocationContext context,
        CancellationToken cancellationToken)
    {
        var definition = registry.Get(id);
        EnsureAllowed(definition, input, context);
        var handler = (ICapabilityHandler)services.GetRequiredService(definition.HandlerType);
        if (handler.InputType != definition.InputType || handler.OutputType != definition.OutputType)
            throw new InvalidOperationException($"Capability '{id}' handler contract does not match its definition.");
        return await handler.HandleAsync(input, cancellationToken);
    }

    private static void EnsureAllowed(
        CapabilityDefinition definition, object input, CapabilityInvocationContext context)
    {
        if (input.GetType() != definition.InputType
            || !context.Mode.Capabilities.Contains(definition.Id)
            || !definition.AllowedInvokers.Contains(context.Invoker)
            || !definition.AllowedModes.Contains(context.Mode.Mode)
            || !definition.AllowedStates.Contains(context.State)
            || !CapabilityRegistry.ArtifactMatches(definition, context.CurrentArtifactType))
            throw new InvalidOperationException($"Capability '{definition.Id}' is not allowed in the current execution frame.");
        if (definition.ConsentRequirement == ConsentRequirement.VerifiedUserCommand
            && !context.HasVerifiedUserConsent)
            throw new InvalidOperationException($"Capability '{definition.Id}' requires verified user consent.");
    }
}

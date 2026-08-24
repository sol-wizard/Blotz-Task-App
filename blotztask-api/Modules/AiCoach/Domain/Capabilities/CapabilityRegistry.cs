using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Domain.Capabilities;

/// <summary>
/// Unified source of truth for capability definitions, handler resolution and model tool
/// projection (tech design §14/§21.12). Registered as a singleton; validated at startup by
/// <see cref="Validate"/> — any violation must fail application start, not a user conversation.
/// </summary>
public sealed class CapabilityRegistry
{
    private readonly Dictionary<CapabilityId, CapabilityDefinition> _definitions = [];

    public IReadOnlyCollection<CapabilityDefinition> Definitions => _definitions.Values;

    public void Register(CapabilityDefinition definition)
    {
        if (!_definitions.TryAdd(definition.Id, definition))
            throw new InvalidOperationException($"Capability '{definition.Id}' is registered twice.");
    }

    public CapabilityDefinition? Find(CapabilityId id) =>
        _definitions.GetValueOrDefault(id);

    public CapabilityDefinition? FindByToolName(string toolName) =>
        _definitions.Values.FirstOrDefault(d => d.ToolName == toolName);

    /// <summary>
    /// Capabilities projected as model tools for the given mode + state + current artifact
    /// (tech design §21.8): only Model-invokable capabilities matching the current context.
    /// </summary>
    public IReadOnlyList<CapabilityDefinition> ProjectModelToolset(
        AiCoachMode mode,
        ConversationState state)
    {
        return _definitions.Values
            .Where(d => d.AllowedInvokers.Contains(CapabilityInvoker.Model)
                        && d.AllowedModes.Contains(mode)
                        && d.AllowedStates.Contains(state))
            .OrderBy(d => d.Id.Value, StringComparer.Ordinal)
            .ToList();
    }

    /// <summary>Startup validation (tech design §21.12 — the checks applicable to v1's registry).</summary>
    public void Validate(IServiceProvider services, IReadOnlyCollection<Modes.AiCoachModeDefinition> modes)
    {
        var toolNames = new HashSet<string>(StringComparer.Ordinal);
        foreach (var definition in _definitions.Values)
        {
            if (!toolNames.Add(definition.ToolName))
                throw new InvalidOperationException($"Duplicate tool name '{definition.ToolName}'.");

            if (definition.ExecutionSemantics == CapabilityExecutionSemantics.ExternalEffect
                && definition.AllowedInvokers.Contains(CapabilityInvoker.Model))
                throw new InvalidOperationException(
                    $"Capability '{definition.Id}' has external-effect semantics and must never be exposed to the model.");

            if (definition.ExecutionSemantics is CapabilityExecutionSemantics.ProposesArtifact
                    or CapabilityExecutionSemantics.ExternalEffect
                && definition.ConcurrencyPolicy != CapabilityConcurrencyPolicy.SequentialOnly)
                throw new InvalidOperationException(
                    $"Capability '{definition.Id}' proposes artifacts or has external effects and must be SequentialOnly.");

            if (services.GetService(definition.HandlerType) is null)
                throw new InvalidOperationException(
                    $"Capability '{definition.Id}' handler {definition.HandlerType.Name} cannot be resolved from DI.");
        }

        foreach (var mode in modes)
        {
            foreach (var capabilityId in mode.Capabilities)
            {
                if (!_definitions.ContainsKey(capabilityId))
                    throw new InvalidOperationException(
                        $"Mode '{mode.Mode}' references unregistered capability '{capabilityId}'.");
            }
        }
    }
}

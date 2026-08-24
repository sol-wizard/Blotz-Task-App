using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Ai.Prompts;

/// <summary>
/// Deterministic server-side prompt assembly (tech design §25.5). Same PromptVersion + snapshot
/// projection => same modules in the same order, recorded in a body-free manifest. The model
/// never chooses modules; there is deliberately no load_skill-style tool.
/// </summary>
public interface IModelPromptAssembler
{
    AssembledModelPrompt Assemble(PromptAssemblyRequest request);
}

public sealed record PromptAssemblyRequest(
    string PromptVersion,
    AiCoachMode Mode,
    ConversationState State);

public sealed record AssembledModelPrompt(
    string StaticPrefix,
    string DynamicSuffix,
    PromptManifest Manifest);

/// <summary>Body-free record of what was assembled (§25.8), for logging and evaluation.</summary>
public sealed record PromptManifest(
    string PromptVersion,
    IReadOnlyList<string> StaticModules,
    IReadOnlyList<string> DynamicModules);

public sealed class PromptModuleRegistry
{
    private readonly Dictionary<string, PromptProfile> _profiles = [];

    public void Register(PromptProfile profile)
    {
        if (!_profiles.TryAdd(profile.PromptVersion, profile))
            throw new InvalidOperationException($"Prompt profile '{profile.PromptVersion}' is registered twice.");
    }

    public PromptProfile Get(string promptVersion) =>
        _profiles.TryGetValue(promptVersion, out var profile)
            ? profile
            : throw new InvalidOperationException($"Prompt profile '{promptVersion}' is not registered.");

    /// <summary>Startup validation (§25.11): unique module ids, required core modules present.</summary>
    public void Validate()
    {
        foreach (var profile in _profiles.Values)
        {
            var ids = new HashSet<string>(StringComparer.Ordinal);
            foreach (var module in profile.Modules)
            {
                if (!ids.Add($"{module.Id}@{module.Version}"))
                    throw new InvalidOperationException(
                        $"Prompt profile '{profile.PromptVersion}' references module '{module.Id}' v{module.Version} twice.");
                if (string.IsNullOrWhiteSpace(module.Content))
                    throw new InvalidOperationException(
                        $"Prompt module '{module.Id}' v{module.Version} has empty content.");
            }

            if (!profile.Modules.Any(m => m.Kind == PromptModuleKind.Core && m.IsRequired))
                throw new InvalidOperationException(
                    $"Prompt profile '{profile.PromptVersion}' has no required core module.");
        }
    }
}

public sealed class ModelPromptAssembler(PromptModuleRegistry registry) : IModelPromptAssembler
{
    public AssembledModelPrompt Assemble(PromptAssemblyRequest request)
    {
        var profile = registry.Get(request.PromptVersion);

        // Fixed assembly order (§25.5): core -> mode -> state -> artifact -> capability guidance.
        // Profile registration order already encodes kind ordering; filter by applicability.
        var applicable = profile.Modules
            .Where(m => m.AllowedModes.Contains(request.Mode) && m.AllowedStates.Contains(request.State))
            .ToList();

        var staticModules = applicable.Where(m => m.Placement == PromptModulePlacement.StaticPrefix).ToList();
        var dynamicModules = applicable.Where(m => m.Placement == PromptModulePlacement.DynamicSuffix).ToList();

        return new AssembledModelPrompt(
            StaticPrefix: string.Join("\n\n", staticModules.Select(m => m.Content)),
            DynamicSuffix: string.Join("\n\n", dynamicModules.Select(m => m.Content)),
            Manifest: new PromptManifest(
                profile.PromptVersion,
                staticModules.Select(m => $"{m.Id}@{m.Version}").ToList(),
                dynamicModules.Select(m => $"{m.Id}@{m.Version}").ToList()));
    }
}

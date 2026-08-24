using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Ai.Prompts;

public enum PromptModuleKind
{
    Core = 0,
    Mode = 1,
    Phase = 2,
    Artifact = 3,
}

public enum PromptModulePlacement
{
    StaticPrefix = 0,
    DynamicSuffix = 1,
}

/// <summary>
/// Versioned, code-reviewed prompt module (v3 tech design §9). Content ships with the app as
/// readonly constants — never assembled from user input, model output or database text. The
/// model cannot load, replace or unload modules; selection is fully server-side and
/// deterministic.
/// </summary>
public sealed record PromptModuleDefinition(
    string Id,
    int Version,
    PromptModuleKind Kind,
    PromptModulePlacement Placement,
    IReadOnlySet<AiCoachMode> AllowedModes,
    IReadOnlySet<ConversationPhase> AllowedPhases,
    bool IsRequired,
    string Content);

/// <summary>
/// Immutable prompt profile referenced by a conversation's pinned PromptVersion (v3 §6).
/// Changing any module content requires a new module version and a new profile version.
/// </summary>
public sealed record PromptProfile(
    string PromptVersion,
    IReadOnlyList<PromptModuleDefinition> Modules);

public sealed record PromptAssemblyRequest(
    string PromptVersion,
    AiCoachMode Mode,
    ConversationPhase Phase);

public sealed record AssembledModelPrompt(
    string StaticPrefix,
    string DynamicSuffix,
    PromptManifest Manifest);

/// <summary>Body-free record of what was assembled (v3 §9 PromptManifest), for logging.</summary>
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

    public bool IsRegistered(string promptVersion) => _profiles.ContainsKey(promptVersion);

    /// <summary>Startup validation: unique module ids, required core module present.</summary>
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

/// <summary>
/// Deterministic server-side prompt assembly (v3 tech design §9). Same PromptVersion + snapshot
/// projection => same modules in the same order, recorded in a body-free manifest. The model
/// never chooses modules.
/// </summary>
public interface IModelPromptAssembler
{
    AssembledModelPrompt Assemble(PromptAssemblyRequest request);
}

public sealed class ModelPromptAssembler(PromptModuleRegistry registry) : IModelPromptAssembler
{
    public AssembledModelPrompt Assemble(PromptAssemblyRequest request)
    {
        var profile = registry.Get(request.PromptVersion);

        // Fixed assembly order: core -> mode -> phase -> artifact. Profile registration order
        // already encodes kind ordering; filter by applicability.
        var applicable = profile.Modules
            .Where(m => m.AllowedModes.Contains(request.Mode) && m.AllowedPhases.Contains(request.Phase))
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

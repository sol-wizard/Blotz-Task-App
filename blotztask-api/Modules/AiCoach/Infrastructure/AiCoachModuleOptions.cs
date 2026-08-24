namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>
/// Centralized model-turn limits and module settings (v3 tech design §21: the model loop must
/// never be an unbounded while; limits live in versioned central config). Bound from the
/// "AiCoach" configuration section; DeploymentId falls back to AzureOpenAI:AiModels:TaskGeneration.
/// </summary>
public sealed class AiCoachModuleOptions
{
    public const string SectionName = "AiCoach";

    public string DeploymentId { get; set; } = "";

    /// <summary>
    /// Total gateway calls per turn (v3 §21). Schema corrections, regenerations and (future)
    /// read-only tool continuations all share this budget — they never stack on top of it.
    /// </summary>
    public int MaxModelIterations { get; set; } = 4;

    public int MaxSchemaCorrectionAttempts { get; set; } = 1;

    public int MaxRegenerationAttempts { get; set; } = 1;

    public int ModelRequestTimeoutSeconds { get; set; } = 60;

    /// <summary>
    /// Lease window recorded on a tracked effect (v3 §7.4). v1 executes effects in-process, so
    /// the lease is informational — but the shape matches the future worker model.
    /// </summary>
    public int EffectLeaseSeconds { get; set; } = 180;

    /// <summary>
    /// Absolute lifetime of an in-memory conversation (ExpiresAt semantics on the store;
    /// Execution mode is a per-session conversation).
    /// </summary>
    public int ConversationLifetimeHours { get; set; } = 24;

    /// <summary>
    /// Prices of the configured deployment in USD per 1M tokens, used ONLY for the console
    /// cost line ("AiCoach usage" log). 0 = unknown: tokens are still logged, dollars are not.
    /// Set them in appsettings.Development.json from the Azure OpenAI pricing page.
    /// </summary>
    public decimal InputTokenUsdPerMillion { get; set; }

    public decimal OutputTokenUsdPerMillion { get; set; }
}

namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>
/// Centralized model-turn limits and module settings (tech design §21.11: the model loop must
/// never be an unbounded while; §25.10: limits live in versioned central config). Bound from the
/// "AiCoach" configuration section; DeploymentId falls back to AzureOpenAI:AiModels:TaskGeneration.
/// </summary>
public sealed class AiCoachModuleOptions
{
    public const string SectionName = "AiCoach";

    public string DeploymentId { get; set; } = "";

    public int MaxModelIterations { get; set; } = 4;

    public int MaxCapabilityCallsPerTurn { get; set; } = 3;

    public int MaxSchemaCorrectionAttempts { get; set; } = 1;

    public int ModelRequestTimeoutSeconds { get; set; } = 60;

    /// <summary>
    /// Absolute lifetime of an in-memory Execution conversation (ExpiresAt semantics on the
    /// store; Execution mode is a per-session conversation, requirements §14.1).
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

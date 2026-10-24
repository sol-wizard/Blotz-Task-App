namespace BlotzTask.Modules.AiCoach.Infrastructure;

public sealed class AiCoachModuleOptions
{
    public const string SectionName = "AiCoach";
    public string DefaultModel { get; set; } = "";
    public Dictionary<string, AiCoachModelOptions> Models { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    // Retained for deployments that have not adopted named profiles yet.
    public string DeploymentId { get; set; } = "";
    public int MaxModelCallsPerTurn { get; set; } = 12;
    public int MaxToolCallsPerTurn { get; set; } = 24;
    public int MaxToolArgumentBytes { get; set; } = 64000;
    public int MaxOutputTokens { get; set; } = 4096;
    // Conservative UTF-8 byte estimate bounds token use, including multilingual history.
    public int ContextTokenBudget { get; set; } = 32000;
    public int ModelRequestTimeoutSeconds { get; set; } = 60;
    public int TopicIdleHours { get; set; } = 8;
    public int MessageRetentionDays { get; set; } = 180;
    public int TraceRetentionDays { get; set; } = 30;
    public decimal InputTokenUsdPerMillion { get; set; }
    public decimal OutputTokenUsdPerMillion { get; set; }
}

public sealed class AiCoachModelOptions
{
    public string DeploymentId { get; set; } = "";
    public string Api { get; set; } = "ChatCompletions";
    public string? ReasoningEffort { get; set; }
    public int MaxOutputTokens { get; set; } = 4096;
    public int RequestTimeoutSeconds { get; set; } = 60;
    // Null means unverified/unconfigured, not free usage.
    public decimal? InputTokenUsdPerMillion { get; set; }
    public decimal? CachedInputTokenUsdPerMillion { get; set; }
    public decimal? OutputTokenUsdPerMillion { get; set; }
}

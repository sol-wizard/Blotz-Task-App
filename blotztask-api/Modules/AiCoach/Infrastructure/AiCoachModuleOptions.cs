namespace BlotzTask.Modules.AiCoach.Infrastructure;

public sealed class AiCoachModuleOptions
{
    public const string SectionName = "AiCoach";
    public string DefaultModel { get; set; } = "";
    public Dictionary<string, AiCoachModelOptions> Models { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    // Perth-calendar-month spend limits, enforced together in every environment that sets both:
    // a cap for the whole environment and a free allowance per user. No top-ups.
    public decimal? MonthlyBudgetUsd { get; set; }
    public decimal? UserMonthlyAllowanceUsd { get; set; }
    // Retained for deployments that have not adopted named profiles yet.
    public string DeploymentId { get; set; } = "";
    public int MaxModelCallsPerTurn { get; set; } = 12;
    public int MaxToolCallsPerTurn { get; set; } = 24;
    public int MaxToolArgumentBytes { get; set; } = 64000;
    public int MaxOutputTokens { get; set; } = 4096;
    // Conservative UTF-8 byte estimate bounds token use, including multilingual history.
    public int ContextTokenBudget { get; set; } = 48000;
    // Size cap of one list_tasks result. 3000 bytes at the 48000 default; grows with a larger budget so a
    // busy week fits in one read, and never exceeds an eighth of the budget.
    public int TaskReadBytes => Math.Min(ContextTokenBudget / 8, Math.Max(3000, ContextTokenBudget / 16));
    public int ModelRequestTimeoutSeconds { get; set; } = 60;
    public int TopicIdleHours { get; set; } = 8;
    public int MessageRetentionDays { get; set; } = 180;
    public int TraceRetentionDays { get; set; } = 90;
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
    // Replaces AiCoach:ContextTokenBudget while this profile is the DefaultModel; same UTF-8 byte unit.
    // Lets a model with a large context window keep more history than the shared default.
    public int? ContextTokenBudget { get; set; }
    // Null means unverified/unconfigured, not free usage.
    public decimal? InputTokenUsdPerMillion { get; set; }
    public decimal? CachedInputTokenUsdPerMillion { get; set; }
    public decimal? OutputTokenUsdPerMillion { get; set; }
}

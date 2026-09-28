namespace BlotzTask.Modules.AiCoach.Infrastructure;

public sealed class AiCoachModuleOptions
{
    public const string SectionName = "AiCoach";
    public string DeploymentId { get; set; } = "";
    public int MaxModelCallsPerTurn { get; set; } = 12;
    public int MaxToolCallsPerTurn { get; set; } = 24;
    public int MaxToolArgumentBytes { get; set; } = 64000;
    public int MaxOutputTokens { get; set; } = 4096;
    // Conservative UTF-8 byte estimate bounds token use, including multilingual history.
    public int ContextTokenBudget { get; set; } = 24000;
    public int ModelRequestTimeoutSeconds { get; set; } = 60;
    public int ConversationLifetimeHours { get; set; } = 24;
    public int TraceRetentionDays { get; set; } = 30;
    public decimal InputTokenUsdPerMillion { get; set; }
    public decimal OutputTokenUsdPerMillion { get; set; }
}

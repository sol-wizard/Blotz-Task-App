namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// One row per chat turn or background digest call, with the numbers needed for analysis and no conversation text.
/// Kept for <c>MessageRetentionDays</c> (longer than trace events) and removed when the user clears chat history.
/// </summary>
public sealed class AiCoachTurnSummary
{
    public const string TurnKind = "turn";
    public const string DigestKind = "digest";

    public long Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ConversationId { get; set; }
    /// <summary>The user message ID for a turn; null for a digest.</summary>
    public Guid? TurnId { get; set; }
    public string Kind { get; set; } = TurnKind;
    public DateTimeOffset CreatedAt { get; set; }
    /// <summary>text or voice for a turn; null for a digest.</summary>
    public string? Source { get; set; }
    public string? Model { get; set; }
    public string? DeploymentId { get; set; }
    public string? Api { get; set; }
    public string? PromptVersion { get; set; }
    public string? ToolContractVersion { get; set; }
    /// <summary>Null when the turn or digest succeeded.</summary>
    public string? ErrorCode { get; set; }
    public string? CommitStatus { get; set; }
    public int ModelCallCount { get; set; }
    public int ToolCallCount { get; set; }
    /// <summary>Comma-separated tool names in call order, repeats included.</summary>
    public string? ToolNames { get; set; }
    public int InputTokens { get; set; }
    public int CachedInputTokens { get; set; }
    public int OutputTokens { get; set; }
    public int TotalTokens { get; set; }
    /// <summary>Null when the model has no configured price, not when it was free.</summary>
    public decimal? EstimatedUsd { get; set; }
    public long DurationMs { get; set; }

    // Draft results. Several turns can shape one draft, so every turn that changed it carries the same outcome.
    /// <summary>The pending draft this turn's tools created or changed; null if the turn left drafts alone.</summary>
    public Guid? DraftId { get; set; }
    /// <summary>Items in that draft when this turn finished.</summary>
    public int? DraftItemCount { get; set; }
    /// <summary>Times the user edited the draft card before acting on it.</summary>
    public int DraftUserEditCount { get; set; }
    /// <summary>confirmed or rejected; null while pending and when it expired with its topic.</summary>
    public string? DraftOutcome { get; set; }
    /// <summary>Items saved as tasks or notes on confirmation; fewer than the draft when the user picked some.</summary>
    public int? DraftSavedItemCount { get; set; }
    public DateTimeOffset? DraftOutcomeAt { get; set; }
}

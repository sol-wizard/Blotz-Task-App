namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>Stored segment working state; visible messages live in AiCoachMessage.</summary>
public sealed class AiCoachConversationRecord
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public int MessageCount { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public string? ClosingSummary { get; set; }
    /// <summary>Messages up to this time have been read for memories; existing rows start at migration time.</summary>
    public DateTimeOffset MemoryProcessedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset LastActivityAt { get; set; }
    /// <summary>Optimistic concurrency token, incremented by every save.</summary>
    public int Revision { get; set; }
    public int SchemaVersion { get; set; }
    public string Payload { get; set; } = "";
}

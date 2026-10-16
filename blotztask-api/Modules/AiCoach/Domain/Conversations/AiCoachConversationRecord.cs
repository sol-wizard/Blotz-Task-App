namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>Stored conversation: the serialized aggregate plus columns for listing and cleanup.</summary>
public sealed class AiCoachConversationRecord
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public AiCoachMode Mode { get; set; }
    public string? Title { get; set; }
    public string? LastMessagePreview { get; set; }
    public int MessageCount { get; set; }
    public bool HasPendingDraft { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset LastActivityAt { get; set; }
    /// <summary>Optimistic concurrency token, incremented by every save.</summary>
    public int Revision { get; set; }
    public int SchemaVersion { get; set; }
    public string Payload { get; set; } = "";
}

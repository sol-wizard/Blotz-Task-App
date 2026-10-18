namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>Committed with the created entities, so interrupted conversation updates are recoverable.</summary>
public sealed class AiCoachDraftConfirmation
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ConversationId { get; set; }
    public Guid DraftId { get; set; }
    public Guid CommandId { get; set; }
    public required string RequestHash { get; set; }
    public required string SavedDraftJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

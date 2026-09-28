namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

public sealed class AiCoachFeedback
{
    public Guid UserId { get; set; }
    public Guid AssistantMessageId { get; set; }
    public Guid ConversationId { get; set; }
    public Guid TurnId { get; set; }
    public string Rating { get; set; } = "";
    public string? Reason { get; set; }
    public string? Detail { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

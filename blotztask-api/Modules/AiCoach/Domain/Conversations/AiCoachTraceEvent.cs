namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

public sealed class AiCoachTraceEvent
{
    public long Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ConversationId { get; set; }
    public Guid? TurnId { get; set; }
    public Guid? AssistantMessageId { get; set; }
    public string Kind { get; set; } = "";
    public string Payload { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}

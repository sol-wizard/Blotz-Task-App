namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>A visible message in the user's timeline, independent of model context compression.</summary>
public sealed class AiCoachMessage
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid UserId { get; set; }
    public ConversationMessageRole Role { get; set; }
    public string Content { get; set; } = "";
    public bool TaskContextRead { get; set; }
    public Guid? TurnId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? DraftSnapshot { get; set; }
}

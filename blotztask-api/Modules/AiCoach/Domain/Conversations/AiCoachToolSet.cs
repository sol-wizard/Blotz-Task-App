namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// One distinct list of tool definitions sent to the model, stored once and referenced by hash from
/// <c>model_request</c> trace events. Definitions are code constants with no user data, so rows are
/// shared across users and are not removed by trace retention or chat-history deletion.
/// </summary>
public sealed class AiCoachToolSet
{
    public string Hash { get; set; } = "";
    public string Definitions { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}

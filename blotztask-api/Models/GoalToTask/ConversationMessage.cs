namespace BlotzTask.Models.GoalToTask;

// This class is strongly typed to client end (frontend) expected messaging object
// Any changes of structure in this class need to also change in the client end (ConversationMessage)
public class ConversationMessage
{
    //TODO: Not sure if we need default here, or is there other way to suppress compiler warning
    public string Sender { get; set; } = default!;
    public string Content { get; set; } = default!;
    public string ConversationId { get; set; } = default!;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public bool IsBot { get; set; } = false;
}
namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Actions the server may offer the client (tech design §18). The client renders ONLY
/// what appears in <c>allowedActions</c> — buttons are never hard-coded client-side.
/// Enum member names are projected to snake_case wire values by
/// <see cref="ConversationActionExtensions.ToWireValue"/>.
/// </summary>
public enum ConversationAction
{
    SendMessage = 0,
    StartNow = 1,
    // 2 was DoLater — removed per product decision 2026-08-22 (merged into AddToTaskList).
    AddToTaskList = 3,
    RejectDraft = 4,
    RetryConfirm = 5,
}

public static class ConversationActionExtensions
{
    public static string ToWireValue(this ConversationAction action) => action switch
    {
        ConversationAction.SendMessage => "send_message",
        ConversationAction.StartNow => "start_now",
        ConversationAction.AddToTaskList => "add_to_task_list",
        ConversationAction.RejectDraft => "reject_draft",
        ConversationAction.RetryConfirm => "retry_confirm",
        _ => throw new ArgumentOutOfRangeException(nameof(action), action, "Unmapped conversation action"),
    };

    public static ConversationAction? FromWireValue(string value) => value switch
    {
        "send_message" => ConversationAction.SendMessage,
        "start_now" => ConversationAction.StartNow,
        "add_to_task_list" => ConversationAction.AddToTaskList,
        "reject_draft" => ConversationAction.RejectDraft,
        "retry_confirm" => ConversationAction.RetryConfirm,
        _ => null,
    };
}

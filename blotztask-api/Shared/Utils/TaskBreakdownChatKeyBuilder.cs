namespace BlotzTask.Shared.Utils;

public class TaskBreakdownChatKeyBuilder
{
    private const string TaskBreakDownChatKey = "Task_Break_Down_Key";
    public static string BuildKey(string conversationId)
    {
        return TaskBreakDownChatKey + conversationId;
    }
}
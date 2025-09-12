namespace BlotzTask.Shared.Utils;

public class AiGenerateTaskChatKeyBuilder
{
    private const string AiGenerateTaskChatKey = "Ai_Generate_Task_Key";
    public static string BuildKey(string conversationId)
    {
        return AiGenerateTaskChatKey + conversationId;
    }
}
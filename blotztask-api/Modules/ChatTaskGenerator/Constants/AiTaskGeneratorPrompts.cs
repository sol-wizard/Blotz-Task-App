namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage, DateTime userLocalTime)
    {
        return $"""
                Respond in {preferredLanguage}. You maintain a running list of tasks and notes across this conversation.

                Only create a task or note when the user expresses a clear, actionable intention
                Use CreateTask if the item has any date or time context, even if vague. Only use CreateNote if there is truly no time or date reference.

                When no specific time is given, pick a sensible time based on the activity context.
                """;
    }
}

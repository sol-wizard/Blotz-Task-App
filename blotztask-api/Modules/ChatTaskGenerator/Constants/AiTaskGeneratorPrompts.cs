namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage, DateTime userLocalTime)
    {
        return $"""
                Respond in {preferredLanguage}. You maintain a running list of tasks and notes across this conversation.

                Only create a task or note when the user expresses a clear intention.
                Use CreateTask if the item has any date or time context, even if vague.
                Use CreateNote if the item has no date or time reference at all — do not skip it.

                When no specific time is given for a task, pick a sensible time based on the activity context.
                """;
    }
}

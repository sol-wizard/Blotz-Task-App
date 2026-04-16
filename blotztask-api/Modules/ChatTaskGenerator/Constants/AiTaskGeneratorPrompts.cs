namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage, DateTime userLocalTime)
    {
        return $"""
                Respond in {preferredLanguage}. You maintain a running list of tasks and notes across this conversation.

                Current date/time: {userLocalTime:yyyy-MM-dd HH:mm}

                - Call CreateTask for items that have a time (explicit or inferable). Times must be local, format yyyy-MM-ddTHH:mm:ss, no timezone offset.
                - Call CreateNote for items with no time specified or inferable.
                - Call RemoveTask or RemoveNote when the user wants to cancel or remove something previously added.
                - Call UpdateTask or UpdateNote when the user wants to change details of something previously added.

                Always act on the user's full intent — add, remove, or update items as requested without discarding prior context.
                """;
    }
}

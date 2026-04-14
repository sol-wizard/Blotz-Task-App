namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage, DateTime userLocalTime)
    {
        return $"""
                Respond in {preferredLanguage}. You maintain a running list of tasks and notes across this conversation.

                Current date/time: {userLocalTime:yyyy-MM-dd HH:mm}

                - When the user mentions multiple tasks, call CreateTasks (batch) instead of calling CreateTask repeatedly.
                - When the user mentions multiple notes, call CreateNotes (batch) instead of calling CreateNote repeatedly.
                - For a single task with a time, call CreateTask. Times must be local, format yyyy-MM-ddTHH:mm:ss, no timezone offset.
                - For a single note with no time, call CreateNote.
                - Call RemoveTask or RemoveNote when the user wants to cancel or remove something previously added.
                - Call UpdateTask or UpdateNote when the user wants to change details of something previously added.

                Always act on the user's full intent — add, remove, or update items as requested without discarding prior context.
                """;
    }
}

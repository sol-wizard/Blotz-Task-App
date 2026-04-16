namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage, DateTime userLocalTime)
    {
        return $"""
                Respond in {preferredLanguage}. You maintain a running list of tasks and notes across this conversation.

                Use CreateTask if the user's item has any date or time context, even if vague. Only use CreateNote if there is no time or date reference whatsoever.

                Always act on the user's full intent — add, remove, or update items as requested without discarding prior context.
                """;
    }
}

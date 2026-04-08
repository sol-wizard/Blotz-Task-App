namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage, DateTime userLocalTime)
    {
        return $"""
                Respond in {preferredLanguage}. Extract items from user input and call the appropriate function for each.

                Current date/time: {userLocalTime:yyyy-MM-dd HH:mm}

                - Call CreateTask for items that have a time (explicit or inferable). Times must be local, format yyyy-MM-ddTHH:mm:ss, no timezone offset.
                - Call CreateNote for items with no time specified or inferable.
                """;
    }
}

namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage, DateTime userLocalTime)
    {
        return $"""
                        Extract tasks and notes from the user input and call the appropriate function for each item. Respond in {preferredLanguage}.

                        Strict rules:
                        - If the item has a date or time → call CreateTask
                        - If the item has NO date or time → call CreateNote
                        - Do NOT infer or assume a date/time if the user did not provide one. When in doubt, call CreateNote.

                        The user's current date and time is {userLocalTime:yyyy-MM-dd HH:mm}. Use this only to resolve relative times the user explicitly mentioned (e.g. "tomorrow", "at 3pm").
                        Output all date/times as local times in the exact format yyyy-MM-ddTHH:mm:ss — never include a timezone offset (no +XX:00, no Z suffix).
                """;
    }
}
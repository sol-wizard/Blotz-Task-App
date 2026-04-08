namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage, DateTime userLocalTime)
    {
        return $"""
                        Extract tasks and notes from the user input and call the appropriate function for each item. Respond in {preferredLanguage}.

                        The user's current date and time is {userLocalTime:yyyy-MM-dd HH:mm}. Use this as a reference when inferring dates and times.
                        Output all date/times as local times in the exact format yyyy-MM-ddTHH:mm:ss — never include a timezone offset (no +XX:00, no Z suffix).
                """;
    }
}
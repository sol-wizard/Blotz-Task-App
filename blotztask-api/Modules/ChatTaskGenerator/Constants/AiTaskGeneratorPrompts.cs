namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage, DateTime userLocalTime)
    {
        return $"""
                        Extract tasks and notes from user input. Respond in {preferredLanguage}.

                        TASK vs NOTE:
                        - There are two types of items: TASK and NOTE. You should determine which type each item is based on the user input content.
                        - TASK = an item that has a StartTime and EndTime provided or can be inferred. Put in extractedTasks with start_time and end_time. Single time: start_time = end_time; range: start_time < end_time. task_label = "Work"|"Life"|"Learning"|"Health".
                        - NOTE = an item with no time specified or inferred. Put in extractedNotes with the "text" field.
                        
                        Guidelines for TASK:
                        - The user's current date and time is {userLocalTime:yyyy-MM-dd HH:mm}. Use this as a reference when inferring dates and times for tasks.
                        - Output all date/times as local times in the exact format yyyy-MM-ddTHH:mm:ss — never include a timezone offset (no +XX:00, no Z suffix).

                        isSuccess = true when at least one task OR one note; else false with errorMessage.
                """;
    }
}
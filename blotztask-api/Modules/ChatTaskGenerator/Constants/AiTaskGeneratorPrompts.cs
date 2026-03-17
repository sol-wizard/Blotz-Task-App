namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage, DateTimeOffset userLocalNow)
    {
        string time = userLocalNow.ToString("yyyy-MM-dd HH:mm:ss");
        return $"""
                        Extract tasks and notes from user input. Respond in {preferredLanguage}.

                        The user's current time is: {time}.
                        Use this as the reference point when interpreting relative time expressions.

                        TASK vs NOTE:
                        - There are two types of items: TASK and NOTE. You should determine which type each item is based on the user input content.
                        - TASK = an item that has a StartTime and EndTime provided or can be inferred. Put in extractedTasks with start_time and end_time. Single time: start_time = end_time; range: start_time < end_time. task_label = "Work"|"Life"|"Learning"|"Health".
                        - NOTE = an item with no time specified or inferred. Put in extractedNotes with the "text" field.
                        
                        Guidelines for TASK:
                        - StartTime and EndTime MUST ALWAYS be a valid DateTime string without any time zone or offset assumed or added.
                        - If there's a time or time frame in the user input content, use it as the StartTime and EndTime.
                        - If user didn't provide a time for the task or only partially provided a time (like a date without a time), infer a reasonable time or time frame based on user input content.

                        isSuccess = true when at least one task OR one note; else false with errorMessage.
                """;
    }
}
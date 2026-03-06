namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage)
    {
        return $"""
                       Extract tasks and notes from user input. Respond in {preferredLanguage}.

                       TASK vs NOTE:
                       - TASK = an item that has a StartTime and EndTime provided in the input. Put in extractedTasks with start_time and end_time. Single time: start_time = end_time; range: start_time < end_time. task_label = "Work"|"Life"|"Learning"|"Health".
                       - NOTE = an item with no time provided. Put in extractedNotes with the "text" field.

                       isSuccess = true when at least one task OR one note; else false with errorMessage.
                """;
    }
}
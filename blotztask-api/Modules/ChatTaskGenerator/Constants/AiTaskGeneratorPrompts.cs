using System.Globalization;

namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(DateTime currentTime, DayOfWeek dayOfWeek, string preferredLanguage)
    {
        var formattedTime = currentTime.ToString("yyyy-MM-dd'T'HH:mm", CultureInfo.InvariantCulture);

        return $"""
                       Extract tasks and notes from user input. Context: currentTime = {formattedTime}, dayOfWeek = {dayOfWeek}. Respond in {preferredLanguage}.

                       ESSENTIAL — TASK vs NOTE:
                       - TASK = user gives a date or time (e.g. "tomorrow at 3pm", "next Monday", "at 5pm"). Put in extractedTasks with start_time and end_time. task_label = "Work"|"Life"|"Learning"|"Health". Single time: start_time = end_time; range: start_time < end_time. Relative dates from currentTime/dayOfWeek.
                       - NOTE = user gives no date or time (e.g. "buy milk", "call John", "idea: build an app"). Put in extractedNotes with the "text" field. Use for reminders, ideas, untimed items.

                       isSuccess = true when at least one task OR one note; else false with errorMessage.
                """;
    }
}
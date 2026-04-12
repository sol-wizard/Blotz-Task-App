namespace BlotzTask.Modules.BreakDown.Prompts;

//TODO: Please reivew the prompt again with concise testing if this break the previous breakdown accuracy
public static class TaskBreakdownPrompts
{
    public static string GetBreakdownPrompt(
        string preferredLanguage,
        string title,
        string description,
        string startTime,
        string endTime)
    {
        return $"""
                Respond in {preferredLanguage}. Break down this task into subtasks using AddSubTask.

                Title: {title}
                Description: {description}
                Start: {startTime} | End: {endTime}

                Rules:
                - Minimum 2 subtasks. First must be 1-5 min (frictionless start). Rest at least PT6M.
                - Duration: ISO 8601 hours/minutes only (PT30M, PT1H30M). Never PT1D — use PT24H.
                """;
    }
}

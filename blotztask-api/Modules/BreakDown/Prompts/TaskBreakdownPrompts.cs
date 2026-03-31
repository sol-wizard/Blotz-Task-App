namespace BlotzTask.Modules.BreakDown.Prompts;

public static class TaskBreakdownPrompts
{
    public static string GetBreakdownPrompt(string preferredLanguage)
    {
        return $$$"""
                  Break down the given task into subtasks.Respond in {{{preferredLanguage}}}.

                  Task Title: {{$title}}
                  Description: {{$description}}
                  Start Time: {{$startTime}}
                  End Time: {{$endTime}}

                  Guidelines:
                  - Break the task into logical, actionable subtasks with realistic durations. 
                  - You MUST generate at least 2 subtasks, unless BOTH the task title and description are clearly non-actionable gibberish.
                  - The FIRST subtask MUST be a tiny, frictionless action that helps the user start the task immediately.
                  - The FIRST subtask duration MUST be between 1 and 5 minutes.
                  - EVERY other subtask (order 2+) MUST have a duration greater than 5 minutes (at least PT6M).
                  - You don't need to cover the whole time span of the task. Avoid generating too many subtasks. 
                  - If StartTime equals EndTime, infer realistic subtask durations from the task content.
                  - Each subtask should have a title, duration in ISO 8601 format, and sequential order starting from 1.
                  - Duration format: Use ONLY hours and minutes (e.g., PT30M, PT1H30M, PT24H for 1 day, PT72H for 3 days).
                  - NEVER use day notation (PT1D is invalid - use PT24H instead).


                  Output language rule:
                  - The TARGET OUTPUT LANGUAGE is specified as: {{$preferredLanguage}}

                  isSuccess = true when at least one subtask; else false with errorMessage.
                  """;
    }
}
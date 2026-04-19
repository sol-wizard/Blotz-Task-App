namespace BlotzTask.Modules.Notes.Prompts;

public static class TaskTimeEstimatePrompts
{
    public static string GetTimeEstimatePrompt(string preferredLanguage, string text)
    {
        return $"""
                Respond in {preferredLanguage}. Estimate how long it takes to handle this note.

                Note: {text}

                - Treat it as a single focused session, not a long-term goal.
                - Use reasonable assumptions if details are missing.
                - Call SetTimeEstimate with duration in hh:mm:ss format.
                - If non-actionable gibberish, call with isSuccess=false and errorMessage in {preferredLanguage}.
                """;
    }
}

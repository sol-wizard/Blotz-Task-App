namespace BlotzTask.Modules.Notes.Prompts;

public static class TaskTimeEstimatePrompts
{
    public static string GetTimeEstimatePrompt(string preferredLanguage)
    {
        return $$$"""
                  Estimate how long it will take to handle a short personal note. Respond in {{{preferredLanguage}}}.

                  Note Content:
                  {{$text}}

                  Instructions:
                  - Treat the note as a single focused session not a long term goal.
                  - If the note does not include full details, use reasonable assumptions to infer a likely handling time.
                  - Return the estimated duration using .NET TimeSpan "c" format (hh:mm:ss).
                  - If the note is non-actionable gibberish, return isSuccess=false and provide a short errorMessage.

                  Output language rule:
                  - If isSuccess=false, errorMessage MUST be written in {{$preferredLanguage}}.

                  Response format (JSON only):
                  {
                    "duration": "hh:mm:ss",
                    "isSuccess": boolean,
                    "errorMessage": ""
                  }
                  """;
    }
}
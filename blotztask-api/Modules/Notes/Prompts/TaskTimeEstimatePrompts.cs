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
                  - Treat the note as a small, informal reminder or thought.
                  - Estimate the time needed to handle it in a single focused session (e.g., replying, deciding, clarifying, or taking a quick action).
                  - Return the estimated duration using .NET TimeSpan "c" format (hh:mm:ss).
                  - If the note is unclear, empty, or cannot reasonably be estimated, return isSuccess=false and provide a short errorMessage.

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
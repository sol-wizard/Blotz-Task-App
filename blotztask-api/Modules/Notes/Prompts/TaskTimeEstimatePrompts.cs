namespace BlotzTask.Modules.Notes.Prompts;

public class TaskTimeEstimatePrompts
{
    public const string Prompt = @"
        You are an assistant that estimates how long it will take to handle a short personal note.

        Note Content:
        {{$text}}

        Instructions:
        - Treat the note as a small, informal reminder or thought.
        - Estimate the time needed to handle it in a single focused session (e.g., replying, deciding, clarifying, or taking a quick action).
        - Return the estimated duration using .NET TimeSpan ""c"" format (hh:mm:ss).

        If the note is unclear, empty, or cannot reasonably be estimated, return isSuccess=false and provide a short errorMessage.

        Response format (JSON only):

        {
          ""duration"": ""hh:mm:ss"",
          ""isSuccess"": boolean,
          ""errorMessage"": """"
        }
    ";
}
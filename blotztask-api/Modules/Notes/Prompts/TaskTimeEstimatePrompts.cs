namespace BlotzTask.Modules.Notes.Prompts;

public class TaskTimeEstimatePrompts
{
    public const string Prompt = @"
        You are a note time estimation assistant. Analyze a short personal note and estimate how much time it would take to properly process or act on it in one focused session.

        Note Content:
        {{$text}}

        Instructions:
        1. Treat the note as a **small, informal thought or reminder**, not a structured task or long-term project.
        2. Estimate the time needed for a **single focused handling session**, such as:
           - clarifying the thought
           - taking a small action
           - making a decision
           - writing a brief follow-up
        3. Use a .NET TimeSpan string in the ""c"" format (hh:mm:ss).

        Response Format:
        Return ONLY a JSON object with this exact structure:
        {
          ""duration"": ""hh:mm:ss""
        }

        Examples:
        - ""Need to reply to Sarah"" → { ""duration"": ""00:05:00"" }
        - ""Felt anxious today"" → { ""duration"": ""00:15:00"" }
        - ""Buy milk on the way home"" → { ""duration"": ""00:05:00"" }
        ";
}

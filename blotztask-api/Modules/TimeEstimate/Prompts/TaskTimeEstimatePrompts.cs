namespace BlotzTask.Modules.TimeEstimate.Prompts;

public class TaskTimeEstimatePrompts
{
    public const string Prompt = @"
    You are a task time estimation assistant. Analyze the given task and provide a realistic time estimate.

    Task Title: {{$title}}
    Description: {{$description}}

    Instructions:
    1. Consider the task complexity, scope, and typical completion time
    2. Account for potential breaks, interruptions, and unforeseen issues
    3. Use a .NET TimeSpan string in the """"c"""" format (hh:mm:ss)

    Response Format:
    Return ONLY a JSON object with this exact structure:
    {
      """"duration"""": """"hh:mm:ss""""
    }

   Examples:
    - """"Write a blog post"""" → { """"duration"""": """"01:00:00"""" }
    - """"Reply to emails"""" → { """"duration"""": """"00:20:00"""" }
    ";
}
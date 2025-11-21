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
    3. Provide a single, realistic time estimate in minutes

    Response Format:
    Return ONLY a JSON object with this exact structure:
    {
      """"duration"""": """"PT<hours>H<minutes>M""""
    }

   Examples:
    - """"Write a blog post"""" → {""""duration"""": """"PT1H30M""""}
    - """"Reply to emails"""" → {""""duration"""": """"PT20M""""}
    ";
}
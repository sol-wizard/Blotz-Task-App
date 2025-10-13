using BlotzTask.Modules.Tasks.Queries.Tasks;

namespace BlotzTask.Modules.BreakDown.prompt;

public class TaskBreakDownPrompt
{
    // *** ENSURE THIS MESSAGE IS STRICT AND INCLUDES THE REQUIRED STRUCTURE ***
    public const string TaskBreakdownSystemMessage = @"
        You are a task breakdown assistant. 
        Your sole purpose is to break down a task into subtasks and return the result as a single JSON object. 
        
        The JSON object MUST contain a single top-level property named 'Subtasks', which holds an array of subtask objects.

        Each subtask object in the 'Subtasks' array must include:
        - title: A short descriptive name (string)
        - duration: Time in ISO 8601 Duration format (e.g., 30 minutes = PT30M, 2 hours = PT2H).
        - order: An integer indicating the sequence of the subtask (1 for the first, 2 for the second, etc.)

        Example of the required JSON output:
        {
          ""Subtasks"": [
            {
              ""title"": ""Research and Outline"",
              ""duration"": ""PT1H30M"",
              ""order"": 1
            },
            {
              ""title"": ""Draft Introduction"",
              ""duration"": ""PT45M"",
              ""order"": 2
            }
          ]
        }

        Guidelines:
        - The total duration of subtasks should not exceed (EndTime - StartTime).
        - If EndTime is null, estimate reasonable durations for subtasks.
        - **DO NOT include any explanation, prose, or text outside of the JSON object.**
        ";
    
    public static string TaskBreakdownUserMessage(TaskByIdItemDto task)
    {
        return $@"
            Task Title: {task.Title}
            Description: {task.Description}
            Start Time: {(task.StartTime?.ToString("yyyy-MM-dd HH:mm") ?? "null")}
            End Time: {(task.EndTime?.ToString("yyyy-MM-dd HH:mm") ?? "null")}
            ";
    }
}
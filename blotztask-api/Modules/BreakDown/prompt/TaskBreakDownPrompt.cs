using BlotzTask.Modules.Tasks.Queries.Tasks;

namespace BlotzTask.Modules.BreakDown.prompt;

public class TaskBreakDownPrompt
{
    public const string TaskBreakdownSystemMessage = @"
        You are a task breakdown assistant. 
        Given a task with title, description, start and end time, you need to break it down into smaller subtasks. 
        Each subtask must include:
        - title: A short descriptive name
        - duration: Time in minutes or hours, always converted into TimeSpan (e.g., 30 minutes = PT30M, 2 hours = PT2H).
        - order: An integer indicating the sequence of the subtask (1 for the first, 2 for the second, etc.)

        Guidelines:
        - The total duration of subtasks should not exceed (EndTime - StartTime).
        - If EndTime is null, estimate reasonable durations for subtasks.
        - Return a JSON object directly, do not wrap it inside another object or string.
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
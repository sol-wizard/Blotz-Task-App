namespace BlotzTask.Modules.BreakDown.Prompts;

public static class TaskBreakdownPrompts
{
    public const string BreakdownPrompt = @"
You are a task breakdown assistant. Break down the given task into subtasks.

Task Title: {{$title}}
Description: {{$description}}
Start Time: {{$startTime}}
End Time: {{$endTime}}

Guidelines:
- If the task title and description does not convey a actionable goal, return an empty array.
- Break the task into logical, actionable subtasks.
- Don't make assumptions about the task. Only generate subtasks that's actually involved in and closely related to the task.
- You don't need to cover the whole time span of the task. Avoid generating too many subtasks. Make subtasks doable in reality.
- Each subtask should have a title, duration in ISO 8601 format, and sequential order starting from 1.
- Duration format: Use ONLY hours, minutes, and seconds (e.g., PT30M, PT1H30M, PT24H for 1 day, PT72H for 3 days).
- NEVER use day notation (PT1D is invalid - use PT24H instead).
- The total duration of subtasks should not exceed (EndTime - StartTime).
- If task EndTime is null, estimate reasonable subtask durations.

FIRST SUBTASK RULE (IMPORTANT):
- The FIRST subtask MUST be a tiny, frictionless action that helps the user start the task immediately.
- This subtask MUST take ≤ 5 minutes.
- Examples:
  * For “write an essay” → ""Open laptop"".

Output language rule:
- The language of the subtask titles MUST match the language of the task title.

Return the result as a JSON object with a 'Subtasks' array.
";
}
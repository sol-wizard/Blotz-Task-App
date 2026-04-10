using System.ComponentModel;
using BlotzTask.Modules.ChatTaskGenerator.DTOs;

namespace BlotzTask.Modules.ChatTaskGenerator.Functions;

public class TaskGenerationTools(List<ExtractedTask> tasks, List<ExtractedNote> notes)
{
    public int ToolCallCount { get; private set; }

    public void ResetCallCount() => ToolCallCount = 0;

    [Description("Add a task that has a scheduled start and end time")]
    public string CreateTask(
        [Description("Short descriptive title for the task")] string title,
        [Description("Detailed description. Empty string if not provided.")] string description,
        [Description("Start time in local time, format yyyy-MM-ddTHH:mm:ss, no timezone offset")] DateTime startTime,
        [Description("End time in local time, format yyyy-MM-ddTHH:mm:ss, no timezone offset. Equal to startTime for single-point tasks.")] DateTime endTime,
        [Description("Category label: Work, Life, Learning, or Health")] LabelNameEnum label)
    {
        ToolCallCount++;
        tasks.Add(new ExtractedTask
        {
            Id = Guid.NewGuid(),
            Title = title,
            Description = description,
            StartTime = startTime,
            EndTime = endTime,
            LabelName = label
        });
        return "Task added.";
    }

    [Description("Add a note for content that has no specific date or time")]
    public string CreateNote(
        [Description("The main content of the note")] string text)
    {
        ToolCallCount++;
        notes.Add(new ExtractedNote
        {
            Id = Guid.NewGuid(),
            Text = text
        });
        return "Note added.";
    }

    [Description("Remove a previously added task by its title")]
    public string RemoveTask(
        [Description("Title of the task to remove")] string title)
    {
        ToolCallCount++;
        var task = tasks.FirstOrDefault(t => t.Title.Equals(title, StringComparison.OrdinalIgnoreCase));
        if (task == null) return "Task not found.";
        tasks.Remove(task);
        return "Task removed.";
    }

    [Description("Update the details of a previously added task")]
    public string UpdateTask(
        [Description("Current title of the task to update")] string existingTitle,
        [Description("New title")] string title,
        [Description("Updated description. Empty string if not provided.")] string description,
        [Description("New start time, format yyyy-MM-ddTHH:mm:ss, no timezone offset")] DateTime startTime,
        [Description("New end time, format yyyy-MM-ddTHH:mm:ss, no timezone offset")] DateTime endTime,
        [Description("Category label: Work, Life, Learning, or Health")] LabelNameEnum label)
    {
        ToolCallCount++;
        var task = tasks.FirstOrDefault(t => t.Title.Equals(existingTitle, StringComparison.OrdinalIgnoreCase));
        if (task == null) return "Task not found.";
        task.Title = title;
        task.Description = description;
        task.StartTime = startTime;
        task.EndTime = endTime;
        task.LabelName = label;
        return "Task updated.";
    }

    [Description("Remove a previously added note")]
    public string RemoveNote(
        [Description("Text of the note to remove")] string text)
    {
        ToolCallCount++;
        var note = notes.FirstOrDefault(n => n.Text.Equals(text, StringComparison.OrdinalIgnoreCase));
        if (note == null) return "Note not found.";
        notes.Remove(note);
        return "Note removed.";
    }

    [Description("Update the text of a previously added note")]
    public string UpdateNote(
        [Description("Current text of the note to update")] string existingText,
        [Description("New text for the note")] string newText)
    {
        ToolCallCount++;
        var note = notes.FirstOrDefault(n => n.Text.Equals(existingText, StringComparison.OrdinalIgnoreCase));
        if (note == null) return "Note not found.";
        note.Text = newText;
        return "Note updated.";
    }
}

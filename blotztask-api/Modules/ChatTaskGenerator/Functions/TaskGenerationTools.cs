using System.ComponentModel;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;

namespace BlotzTask.Modules.ChatTaskGenerator.Functions;
//TODO: Do we really need so many CRUD to do the operation ? Please research if we really need function tools here

public class TaskGenerationTools(List<ExtractedTask> tasks, List<ExtractedNote> notes)
{
    public int ToolCallCount { get; private set; }
    public Func<ExtractedTask, Task>? OnTaskStreamed { get; set; }
    public Func<ExtractedNote, Task>? OnNoteStreamed { get; set; }

    public void ResetCallCount() => ToolCallCount = 0;

    [Description("Add multiple tasks at once. Prefer this over CreateTask when the user mentions more than one task.")]
    public async Task<string> CreateTasks(
        [Description("Array of task titles")] string[] titles,
        [Description("Array of descriptions (empty string if none)")] string[] descriptions,
        [Description("Array of start times in yyyy-MM-ddTHH:mm:ss")] DateTime[] startTimes,
        [Description("Array of end times in yyyy-MM-ddTHH:mm:ss, equals startTime if no duration")] DateTime[] endTimes,
        [Description("Array of labels: Work, Life, Learning, or Health")] LabelNameEnum[] labels)
    {
        ToolCallCount++;
        var count = titles.Length;
        for (var i = 0; i < count; i++)
        {
            var task = new ExtractedTask
            {
                Id = Guid.NewGuid(),
                Title = titles[i],
                Description = i < descriptions.Length ? descriptions[i] : "",
                StartTime = startTimes[i],
                EndTime = endTimes[i],
                LabelName = labels[i]
            };
            tasks.Add(task);
            if (OnTaskStreamed != null) await OnTaskStreamed(task);
        }
        return $"{count} task(s) added.";
    }

    [Description("Add a single task that has a specific date or time.")]
    public async Task<string> CreateTask(
        [Description("Title")] string title,
        [Description("Description or empty")] string description,
        [Description("yyyy-MM-ddTHH:mm:ss")] DateTime startTime,
        [Description("yyyy-MM-ddTHH:mm:ss, equals startTime if no duration")] DateTime endTime,
        [Description("Work, Life, Learning, or Health")] LabelNameEnum label)
    {
        ToolCallCount++;
        var task = new ExtractedTask
        {
            Id = Guid.NewGuid(),
            Title = title,
            Description = description,
            StartTime = startTime,
            EndTime = endTime,
            LabelName = label
        };
        tasks.Add(task);
        if (OnTaskStreamed != null) await OnTaskStreamed(task);
        return "Task added.";
    }

    [Description("Add multiple notes at once. Prefer this over CreateNote when the user mentions more than one note.")]
    public async Task<string> CreateNotes(
        [Description("Array of note texts")] string[] texts)
    {
        ToolCallCount++;
        foreach (var text in texts)
        {
            var note = new ExtractedNote
            {
                Id = Guid.NewGuid(),
                Text = text
            };
            notes.Add(note);
            if (OnNoteStreamed != null) await OnNoteStreamed(note);
        }
        return $"{texts.Length} note(s) added.";
    }

    [Description("Add a single note for an idea or something to remember. Use this when no date or time is mentioned.")]
    public async Task<string> CreateNote(
        [Description("Note content")] string text)
    {
        ToolCallCount++;
        var note = new ExtractedNote
        {
            Id = Guid.NewGuid(),
            Text = text
        };
        notes.Add(note);
        if (OnNoteStreamed != null) await OnNoteStreamed(note);
        return "Note added.";
    }

    [Description("Remove a task")]
    public string RemoveTask(
        [Description("Task title")] string title)
    {
        ToolCallCount++;
        var task = tasks.FirstOrDefault(t => t.Title.Equals(title, StringComparison.OrdinalIgnoreCase));
        if (task == null) return "Task not found.";
        tasks.Remove(task);
        return "Task removed.";
    }

    [Description("Update a task")]
    public string UpdateTask(
        [Description("Current title")] string existingTitle,
        [Description("New title")] string title,
        [Description("Description or empty")] string description,
        [Description("yyyy-MM-ddTHH:mm:ss")] DateTime startTime,
        [Description("yyyy-MM-ddTHH:mm:ss")] DateTime endTime,
        [Description("Work, Life, Learning, or Health")] LabelNameEnum label)
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

    [Description("Remove a note")]
    public string RemoveNote(
        [Description("Note text")] string text)
    {
        ToolCallCount++;
        var note = notes.FirstOrDefault(n => n.Text.Equals(text, StringComparison.OrdinalIgnoreCase));
        if (note == null) return "Note not found.";
        notes.Remove(note);
        return "Note removed.";
    }

    [Description("Update a note")]
    public string UpdateNote(
        [Description("Current text")] string existingText,
        [Description("New text")] string newText)
    {
        ToolCallCount++;
        var note = notes.FirstOrDefault(n => n.Text.Equals(existingText, StringComparison.OrdinalIgnoreCase));
        if (note == null) return "Note not found.";
        note.Text = newText;
        return "Note updated.";
    }
}

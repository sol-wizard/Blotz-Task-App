using System.ComponentModel;
using BlotzTask.Modules.ChatTaskGenerator.DTOs;

namespace BlotzTask.Modules.ChatTaskGenerator.Functions;

public class TaskGenerationTools(List<ExtractedTask> tasks, List<ExtractedNote> notes)
{
    [Description("Create a task that has a scheduled start and end time")]
    public string CreateTask(
        [Description("Short descriptive title for the task")] string title,
        [Description("Detailed description. Empty string if not provided.")] string description,
        [Description("Start time in local time, format yyyy-MM-ddTHH:mm:ss, no timezone offset")] DateTime startTime,
        [Description("End time in local time, format yyyy-MM-ddTHH:mm:ss, no timezone offset. Equal to startTime for single-point tasks.")] DateTime endTime,
        [Description("Category label: Work, Life, Learning, or Health")] LabelNameEnum label)
    {
        tasks.Add(new ExtractedTask
        {
            Id = Guid.NewGuid(),
            Title = title,
            Description = description,
            StartTime = startTime,
            EndTime = endTime,
            LabelName = label
        });
        return "Task recorded.";
    }

    [Description("Create a note for content that has no specific date or time")]
    public string CreateNote(
        [Description("The main content of the note")] string text)
    {
        notes.Add(new ExtractedNote
        {
            Id = Guid.NewGuid(),
            Text = text
        });
        return "Note recorded.";
    }
}

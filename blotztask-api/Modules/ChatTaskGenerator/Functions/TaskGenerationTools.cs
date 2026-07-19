using System.ComponentModel;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.ChatTaskGenerator.Functions;
//TODO: Do we really need so many CRUD to do the operation ? Please research if we really need function tools here

public class TaskGenerationTools()
{
    public int ToolCallCount { get; private set; }

    public List<ExtractedTask> Tasks { get; private set; } = [];
    public List<ExtractedNote> Notes { get; private set; } = [];
    public List<ExtractedRecurringTask> RecurringTasks { get; private set; } = [];
    public Func<ExtractedTask, Task>? OnTaskStreamed { get; set; }
    public Func<ExtractedNote, Task>? OnNoteStreamed { get; set; }
    public Func<ExtractedRecurringTask, Task>? OnRecurringTaskStreamed { get; set; }

    public void ResetCallCount() => ToolCallCount = 0;

    [Description("Add multiple tasks at once. Prefer this over CreateTask when the user mentions more than one task. Assign sequential, non-overlapping times — estimate a realistic duration for each task and start the next where the previous ends.")]
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
            Tasks.Add(task);
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
        Tasks.Add(task);
        if (OnTaskStreamed != null) await OnTaskStreamed(task);
        return "Task added.";
    }

    [Description(
        "Add a task that REPEATS on a schedule. Use this ONLY when the user states a clear, concrete repeating cadence — e.g. 'gym every Monday', 'standup every weekday at 9am', 'pay rent on the 1st of each month', 'yoga every other Tuesday'. " +
        "Do NOT use this for a one-off item with a single date/time (use CreateTask), and do NOT use it when the repetition is vague with no concrete frequency, e.g. 'go running regularly' or 'study more often' (use CreateNote instead). " +
        "Rules: daysOfWeek applies only when frequency is Weekly; dayOfMonth applies only when frequency is Monthly; startDate must equal the date part of templateStartTime.")]
    public async Task<string> CreateRecurringTask(
        [Description("Title")] string title,
        [Description("Description or empty")] string description,
        [Description("SingleTime when the task is a moment with no duration (end equals start); RangeTime when it spans a start and end time.")] TaskTimeType timeType,
        [Description("Work, Life, Learning, or Health")] LabelNameEnum label,
        [Description("First occurrence start as local time yyyy-MM-ddTHH:mm:ss (no timezone offset, no Z). This is the time-of-day used for every occurrence. Its date part MUST equal startDate. If the user gives a day but no time, pick a sensible time of day.")] DateTime templateStartTime,
        [Description("First occurrence end as local time yyyy-MM-ddTHH:mm:ss. Equal to templateStartTime when timeType is SingleTime; strictly after templateStartTime when RangeTime.")] DateTime templateEndTime,
        [Description("How often it repeats: Daily, Weekly, Monthly, or Yearly.")] RecurrenceFrequency frequency,
        [Description("Repeat every N periods. 1 = every day/week/month/year, 2 = every other, and so on. Use 1 unless the user says otherwise.")] int interval,
        [Description("The weekdays the task repeats on, named directly, e.g. [Monday, Wednesday, Friday]. REQUIRED when frequency is Weekly; leave empty otherwise. Just name the days — never compute a number.")] DayOfWeek[] daysOfWeek,
        [Description("Day of month (1-31). REQUIRED when frequency is Monthly; otherwise leave null.")] int? dayOfMonth,
        [Description("Date of the first occurrence as yyyy-MM-dd. MUST equal the date part of templateStartTime.")] DateOnly startDate,
        [Description("Optional last date the task may repeat, as yyyy-MM-dd. Leave null for an open-ended repeat. Must be on or after startDate.")] DateOnly? endDate)
    {
        ToolCallCount++;

        // Friendly -> strict translation lives here, not in the model: named weekdays -> WeeklyDayFlags
        // bitmask, interval clamped, and the fields the endpoint couples to frequency normalized so a
        // creation failure reflects a genuine extraction error rather than a redundant field.
        var weeklyMask = daysOfWeek is { Length: > 0 } ? ToWeeklyBitmask(daysOfWeek) : 0;
        var task = new ExtractedRecurringTask
        {
            Id = Guid.NewGuid(),
            Title = title,
            Description = description,
            TimeType = timeType,
            LabelName = label,
            TemplateStartTime = templateStartTime,
            TemplateEndTime = templateEndTime,
            Frequency = frequency,
            Interval = interval < 1 ? 1 : interval,
            DaysOfWeek = frequency == RecurrenceFrequency.Weekly && weeklyMask != 0 ? weeklyMask : null,
            DayOfMonth = frequency == RecurrenceFrequency.Monthly ? dayOfMonth : null,
            StartDate = startDate,
            EndDate = endDate
        };
        RecurringTasks.Add(task);
        if (OnRecurringTaskStreamed != null) await OnRecurringTaskStreamed(task);
        return "Recurring task added.";
    }

    // Maps named weekdays (System.DayOfWeek: Sun=0..Sat=6) to the WeeklyDayFlags bitmask
    // (Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64) the recurring endpoint expects.
    private static int ToWeeklyBitmask(IEnumerable<DayOfWeek> days)
    {
        var mask = 0;
        foreach (var day in days)
        {
            mask |= day switch
            {
                DayOfWeek.Monday => (int)WeeklyDayFlags.Monday,
                DayOfWeek.Tuesday => (int)WeeklyDayFlags.Tuesday,
                DayOfWeek.Wednesday => (int)WeeklyDayFlags.Wednesday,
                DayOfWeek.Thursday => (int)WeeklyDayFlags.Thursday,
                DayOfWeek.Friday => (int)WeeklyDayFlags.Friday,
                DayOfWeek.Saturday => (int)WeeklyDayFlags.Saturday,
                DayOfWeek.Sunday => (int)WeeklyDayFlags.Sunday,
                _ => 0
            };
        }
        return mask;
    }

    [Description("Add multiple notes at once. Prefer this over CreateNote when the user mentions more than one timeless item.")]
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
            Notes.Add(note);
            if (OnNoteStreamed != null) await OnNoteStreamed(note);
        }
        return $"{texts.Length} note(s) added.";
    }

    [Description("Add a single note for an idea, intention, or reminder with no time anchor. Use this when scheduling the item would require inventing a time the user never mentioned — even vaguely.")]
    public async Task<string> CreateNote(
        [Description("Note content")] string text)
    {
        ToolCallCount++;
        var note = new ExtractedNote
        {
            Id = Guid.NewGuid(),
            Text = text
        };
        Notes.Add(note);
        if (OnNoteStreamed != null) await OnNoteStreamed(note);
        return "Note added.";
    }

    [Description("Remove a task. Use this when the user says they no longer want to do something they previously mentioned, e.g. 'I don't want to go to the gym anymore'.")]
    public string RemoveTask(
        [Description("Task title")] string title)
    {
        ToolCallCount++;
        //TODO: text matching is fragile
        var task = Tasks.FirstOrDefault(t => t.Title.Equals(title, StringComparison.OrdinalIgnoreCase));
        if (task == null) return "Task not found.";
        Tasks.Remove(task);
        return "Task removed.";
    }

    [Description("Update a task. Use this when the user corrects or adjusts something they already said, e.g. changing the time or title of an existing task. When updating times, ensure the result does not overlap with other tasks — adjust sequentially if needed.")]
    public string UpdateTask(
        [Description("Current title")] string existingTitle,
        [Description("New title")] string title,
        [Description("Description or empty")] string description,
        [Description("yyyy-MM-ddTHH:mm:ss")] DateTime startTime,
        [Description("yyyy-MM-ddTHH:mm:ss")] DateTime endTime,
        [Description("Work, Life, Learning, or Health")] LabelNameEnum label)
    {
        ToolCallCount++;
        //TODO: here the same as well
        var task = Tasks.FirstOrDefault(t => t.Title.Equals(existingTitle, StringComparison.OrdinalIgnoreCase));
        if (task == null) return "Task not found.";
        task.Title = title;
        task.Description = description;
        task.StartTime = startTime;
        task.EndTime = endTime;
        task.LabelName = label;
        return "Task updated.";
    }

    [Description("Remove a note. Use this when the user says they no longer want to keep something they previously noted.")]
    public string RemoveNote(
        [Description("Note text")] string text)
    {
        ToolCallCount++;
        //TODO: here
        var note = Notes.FirstOrDefault(n => n.Text.Equals(text, StringComparison.OrdinalIgnoreCase));
        if (note == null) return "Note not found.";
        Notes.Remove(note);
        return "Note removed.";
    }

    [Description("Update a note. Use this when the user corrects or adjusts the content of an existing note.")]
    public string UpdateNote(
        [Description("Current text")] string existingText,
        [Description("New text")] string newText)
    {
        ToolCallCount++;
        //TODO: here
        var note = Notes.FirstOrDefault(n => n.Text.Equals(existingText, StringComparison.OrdinalIgnoreCase));
        if (note == null) return "Note not found.";
        note.Text = newText;
        return "Note updated.";
    }

    // Swipe-to-delete removal by Id. Not AI tools: unregistered, and left out of ToolCallCount
    // and the streaming callbacks on purpose.
    public bool RemoveDraftTaskById(Guid id) => Tasks.RemoveAll(t => t.Id == id) > 0;

    public bool RemoveDraftNoteById(Guid id) => Notes.RemoveAll(n => n.Id == id) > 0;

    public bool RemoveDraftRecurringTaskById(Guid id) => RecurringTasks.RemoveAll(t => t.Id == id) > 0;
}

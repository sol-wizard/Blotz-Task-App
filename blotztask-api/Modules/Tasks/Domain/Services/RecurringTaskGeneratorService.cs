using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.Tasks.Domain.Services;

public class RecurringTaskGeneratorService
{
    /// <summary>
    /// Generates TaskItems for the given recurring task between <paramref name="from"/> and <paramref name="to"/> inclusive.
    /// Does NOT save to the database — caller is responsible for persisting.
    /// </summary>
    public IReadOnlyList<TaskItem> GenerateTaskItems(RecurringTask template, DateOnly from, DateOnly to)
    {
        var results = new List<TaskItem>();
        // Clamp to the task's own StartDate — can't generate task items before the task begins
        var walkDate = from > template.StartDate ? from : template.StartDate;

        while (walkDate <= to)
        {
            if (template.EndDate.HasValue && walkDate > template.EndDate.Value)
                break;

            if (IsOccurrence(template, walkDate))
                results.Add(CreateTaskItem(template, walkDate));

            walkDate = walkDate.AddDays(1);
        }

        return results;
    }

    private static bool IsOccurrence(RecurringTask template, DateOnly date)
    {
        return template.Pattern.Frequency switch
        {
            RecurrenceFrequency.Daily => IsDailyOccurrence(template, date),
            RecurrenceFrequency.Weekly => IsWeeklyOccurrence(template, date),
            RecurrenceFrequency.Monthly => IsMonthlyOccurrence(template, date),
            _ => false,
        };
    }

    private static bool IsDailyOccurrence(RecurringTask template, DateOnly date)
    {
        var daysSinceStart = date.DayNumber - template.StartDate.DayNumber;
        return daysSinceStart >= 0 && daysSinceStart % template.Pattern.Interval == 0;
    }

    private static bool IsWeeklyOccurrence(RecurringTask template, DateOnly date)
    {
        var flag = DayOfWeekToFlag(date.DayOfWeek);
        if (((template.Pattern.DaysOfWeek ?? 0) & (int)flag) == 0)
            return false;

        var startMonday = template.StartDate.AddDays(-MondayOffset(template.StartDate.DayOfWeek));
        var dateMonday = date.AddDays(-MondayOffset(date.DayOfWeek));
        var weeksDiff = (dateMonday.DayNumber - startMonday.DayNumber) / 7;

        return weeksDiff >= 0 && weeksDiff % template.Pattern.Interval == 0;
    }

    private static bool IsMonthlyOccurrence(RecurringTask template, DateOnly date)
    {
        var targetDay = template.Pattern.DayOfMonth ?? template.StartDate.Day;
        if (date.Day != targetDay)
            return false;

        var monthsDiff = (date.Year - template.StartDate.Year) * 12
                         + (date.Month - template.StartDate.Month);

        return monthsDiff >= 0 && monthsDiff % template.Pattern.Interval == 0;
    }

    private static TaskItem CreateTaskItem(RecurringTask template, DateOnly date)
    {
        var startTime = new DateTimeOffset(
            date,
            TimeOnly.FromTimeSpan(template.TemplateStartTime.TimeOfDay),
            template.TemplateStartTime.Offset);

        var endTime = template.TimeType == TaskTimeType.SingleTime
            ? startTime
            : new DateTimeOffset(
                date,
                TimeOnly.FromTimeSpan(template.TemplateEndTime!.Value.TimeOfDay),
                template.TemplateEndTime.Value.Offset);

        return new TaskItem
        {
            Title = template.Title,
            Description = template.Description,
            StartTime = startTime,
            EndTime = endTime,
            TimeType = template.TimeType,
            UserId = template.UserId,
            LabelId = template.LabelId,
            RecurringTaskId = template.Id,
            IsDone = false,
        };
    }

    private static WeeklyDayFlags DayOfWeekToFlag(DayOfWeek day) => day switch
    {
        DayOfWeek.Monday => WeeklyDayFlags.Monday,
        DayOfWeek.Tuesday => WeeklyDayFlags.Tuesday,
        DayOfWeek.Wednesday => WeeklyDayFlags.Wednesday,
        DayOfWeek.Thursday => WeeklyDayFlags.Thursday,
        DayOfWeek.Friday => WeeklyDayFlags.Friday,
        DayOfWeek.Saturday => WeeklyDayFlags.Saturday,
        DayOfWeek.Sunday => WeeklyDayFlags.Sunday,
        _ => WeeklyDayFlags.None,
    };

    private static int MondayOffset(DayOfWeek day) =>
        ((int)day - (int)DayOfWeek.Monday + 7) % 7;
}

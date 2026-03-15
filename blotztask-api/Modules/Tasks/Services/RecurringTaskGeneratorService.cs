using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.Tasks.Domain.Services;

public class RecurringTaskGeneratorService
{
    /// <summary>
    /// Returns true if the recurring task has a valid occurrence on the given date.
    /// </summary>
    public bool IsOccurrenceOn(RecurringTask template, DateOnly date)
    {
        var first = FirstOccurrenceOnOrAfter(template, date);
        return first.HasValue && first.Value == date;
    }

    private static DateOnly? FirstOccurrenceOnOrAfter(RecurringTask template, DateOnly from)
        => template.Pattern.Frequency switch
        {
            RecurrenceFrequency.Daily   => FirstDailyOccurrence(template, from),
            RecurrenceFrequency.Weekly  => FirstWeeklyOccurrence(template, from),
            RecurrenceFrequency.Monthly => FirstMonthlyOccurrence(template, from),
            RecurrenceFrequency.Yearly  => FirstYearlyOccurrence(template, from),
            _ => null,
        };

    private static DateOnly? NextOccurrence(RecurringTask template, DateOnly current)
        => template.Pattern.Frequency switch
        {
            RecurrenceFrequency.Daily   => current.AddDays(template.Pattern.Interval),
            RecurrenceFrequency.Weekly  => NextWeeklyOccurrence(template, current),
            RecurrenceFrequency.Monthly => NextMonthlyOccurrence(template, current),
            RecurrenceFrequency.Yearly  => NextYearlyOccurrence(template, current),
            _ => null,
        };

    // -----------------------------------------------------------------------
    // Daily
    // -----------------------------------------------------------------------

    private static DateOnly FirstDailyOccurrence(RecurringTask template, DateOnly from)
    {
        var daysSinceStart = from.DayNumber - template.StartDate.DayNumber;
        if (daysSinceStart <= 0) return template.StartDate;
        // Ceiling division: round up to the next interval step
        var stepsNeeded = (daysSinceStart + template.Pattern.Interval - 1) / template.Pattern.Interval;
        return template.StartDate.AddDays(stepsNeeded * template.Pattern.Interval);
    }

    // -----------------------------------------------------------------------
    // Weekly
    // -----------------------------------------------------------------------

    private static DateOnly? FirstWeeklyOccurrence(RecurringTask template, DateOnly from)
    {
        var offsets = GetSortedWeekDayOffsets(template.Pattern.DaysOfWeek ?? 0);
        if (offsets.Count == 0) return null;

        var startMonday = template.StartDate.AddDays(-MondayOffset(template.StartDate.DayOfWeek));
        var fromMonday  = from.AddDays(-MondayOffset(from.DayOfWeek));
        var weeksDiff   = (fromMonday.DayNumber - startMonday.DayNumber) / 7;

        // First valid week index (each index = one interval step from start)
        var firstStep = weeksDiff <= 0 ? 0
            : (weeksDiff + template.Pattern.Interval - 1) / template.Pattern.Interval;

        var weekMonday = startMonday.AddDays(firstStep * template.Pattern.Interval * 7);

        // Return first flagged day in this week that is >= from
        foreach (var offset in offsets)
        {
            var candidate = weekMonday.AddDays(offset);
            if (candidate >= from) return candidate;
        }

        // All flagged days in this week are before 'from' — advance one interval
        weekMonday = weekMonday.AddDays(template.Pattern.Interval * 7);
        return weekMonday.AddDays(offsets[0]);
    }

    private static DateOnly? NextWeeklyOccurrence(RecurringTask template, DateOnly current)
    {
        var offsets = GetSortedWeekDayOffsets(template.Pattern.DaysOfWeek ?? 0);
        if (offsets.Count == 0) return null;

        var currentMonday = current.AddDays(-MondayOffset(current.DayOfWeek));
        var currentOffset = current.DayNumber - currentMonday.DayNumber; // 0=Mon … 6=Sun

        // Any flagged day later in the same week?
        var nextInWeek = offsets.FirstOrDefault(o => o > currentOffset, -1);
        if (nextInWeek >= 0) return currentMonday.AddDays(nextInWeek);

        // Advance to the next valid interval week
        var startMonday    = template.StartDate.AddDays(-MondayOffset(template.StartDate.DayOfWeek));
        var weeksFromStart = (currentMonday.DayNumber - startMonday.DayNumber) / 7;
        var nextMonday     = startMonday.AddDays((weeksFromStart + template.Pattern.Interval) * 7);
        return nextMonday.AddDays(offsets[0]);
    }

    // -----------------------------------------------------------------------
    // Monthly
    // -----------------------------------------------------------------------

    private static DateOnly? FirstMonthlyOccurrence(RecurringTask template, DateOnly from)
    {
        var targetDay        = template.Pattern.DayOfMonth ?? template.StartDate.Day;
        var startTotalMonths = template.StartDate.Year * 12 + template.StartDate.Month - 1;
        var fromTotalMonths  = from.Year * 12 + from.Month - 1;
        var monthsDiff       = fromTotalMonths - startTotalMonths;

        var firstStep = monthsDiff <= 0 ? 0
            : (monthsDiff + template.Pattern.Interval - 1) / template.Pattern.Interval;

        // Try forward steps; skip months that don't have targetDay (e.g. Feb for day=31)
        for (var step = firstStep; step <= firstStep + 12; step++)
        {
            var totalMonths = startTotalMonths + step * template.Pattern.Interval;
            var year  = totalMonths / 12;
            var month = totalMonths % 12 + 1;
            if (targetDay > DateTime.DaysInMonth(year, month)) continue;
            var candidate = new DateOnly(year, month, targetDay);
            if (candidate >= from) return candidate;
        }

        return null;
    }

    private static DateOnly? NextMonthlyOccurrence(RecurringTask template, DateOnly current)
    {
        var targetDay        = template.Pattern.DayOfMonth ?? template.StartDate.Day;
        var startTotalMonths = template.StartDate.Year * 12 + template.StartDate.Month - 1;
        var currTotalMonths  = current.Year * 12 + current.Month - 1;
        var currentStep      = (currTotalMonths - startTotalMonths) / template.Pattern.Interval;

        for (var step = currentStep + 1; step <= currentStep + 13; step++)
        {
            var totalMonths = startTotalMonths + step * template.Pattern.Interval;
            var year  = totalMonths / 12;
            var month = totalMonths % 12 + 1;
            if (targetDay <= DateTime.DaysInMonth(year, month))
                return new DateOnly(year, month, targetDay);
        }

        return null;
    }

    // -----------------------------------------------------------------------
    // Yearly
    // -----------------------------------------------------------------------

    private static DateOnly? FirstYearlyOccurrence(RecurringTask template, DateOnly from)
    {
        var targetMonth = template.StartDate.Month;
        var targetDay   = template.StartDate.Day;
        var yearsDiff   = from.Year - template.StartDate.Year;

        var firstStep = yearsDiff <= 0 ? 0
            : (yearsDiff + template.Pattern.Interval - 1) / template.Pattern.Interval;

        // Try forward steps; loop handles Feb 29 in non-leap years
        for (var step = firstStep; step <= firstStep + 8; step++)
        {
            var year = template.StartDate.Year + step * template.Pattern.Interval;
            if (targetDay > DateTime.DaysInMonth(year, targetMonth)) continue;
            var candidate = new DateOnly(year, targetMonth, targetDay);
            if (candidate >= from) return candidate;
        }

        return null;
    }

    private static DateOnly? NextYearlyOccurrence(RecurringTask template, DateOnly current)
    {
        var targetMonth = template.StartDate.Month;
        var targetDay   = template.StartDate.Day;
        var currentStep = (current.Year - template.StartDate.Year) / template.Pattern.Interval;

        for (var step = currentStep + 1; step <= currentStep + 8; step++)
        {
            var year = template.StartDate.Year + step * template.Pattern.Interval;
            if (targetDay <= DateTime.DaysInMonth(year, targetMonth))
                return new DateOnly(year, targetMonth, targetDay);
        }

        return null;
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    public static TaskItem CreateTaskItem(RecurringTask template, DateOnly date)
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
            Title           = template.Title,
            Description     = template.Description,
            StartTime       = startTime,
            EndTime         = endTime,
            TimeType        = template.TimeType,
            UserId          = template.UserId,
            LabelId         = template.LabelId,
            RecurringTaskId = template.Id,
            IsDone          = false,
        };
    }

    /// Returns day offsets from Monday (0=Mon, 1=Tue, …, 6=Sun) for set flags, sorted ascending.
    private static List<int> GetSortedWeekDayOffsets(int daysOfWeek)
    {
        var offsets = new List<int>(7);
        if ((daysOfWeek & (int)WeeklyDayFlags.Monday)    != 0) offsets.Add(0);
        if ((daysOfWeek & (int)WeeklyDayFlags.Tuesday)   != 0) offsets.Add(1);
        if ((daysOfWeek & (int)WeeklyDayFlags.Wednesday) != 0) offsets.Add(2);
        if ((daysOfWeek & (int)WeeklyDayFlags.Thursday)  != 0) offsets.Add(3);
        if ((daysOfWeek & (int)WeeklyDayFlags.Friday)    != 0) offsets.Add(4);
        if ((daysOfWeek & (int)WeeklyDayFlags.Saturday)  != 0) offsets.Add(5);
        if ((daysOfWeek & (int)WeeklyDayFlags.Sunday)    != 0) offsets.Add(6);
        return offsets;
    }

    private static int MondayOffset(DayOfWeek day) =>
        ((int)day - (int)DayOfWeek.Monday + 7) % 7;
}

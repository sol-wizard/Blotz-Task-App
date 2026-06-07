using System.Text.Json.Serialization;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class RecurringOccurrenceIdentityDto
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly OccurrenceDate { get; init; }
}

public class RecurringTaskEditMetadataDto
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required RecurrenceFrequency Frequency { get; init; }

    public required int Interval { get; init; }
    public int? DaysOfWeek { get; init; }
    public int? DayOfMonth { get; init; }
    public required DateOnly StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
}

public abstract class TaskOccurrenceDtoBase
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public TaskOccurrenceKind OccurrenceKind { get; set; }

    public RecurringOccurrenceIdentityDto? RecurringOccurrence { get; set; }

    public RecurringTaskEditMetadataDto? RecurringTask { get; set; }
}

public static class TaskOccurrenceDtoHelpers
{
    public static RecurringOccurrenceIdentityDto ToRecurringOccurrenceIdentity(
        RecurringOccurrenceOverride recurringOverride)
    {
        return new RecurringOccurrenceIdentityDto
        {
            RecurringTaskId = recurringOverride.RecurringTaskId,
            OccurrenceDate = recurringOverride.OccurrenceDate
        };
    }

    public static RecurringTaskEditMetadataDto ToRecurringTaskMetadata(RecurringTask recurringTask)
    {
        return new RecurringTaskEditMetadataDto
        {
            Frequency = recurringTask.Pattern.Frequency,
            Interval = recurringTask.Pattern.Interval,
            DaysOfWeek = recurringTask.Pattern.DaysOfWeek,
            DayOfMonth = recurringTask.Pattern.DayOfMonth,
            StartDate = recurringTask.StartDate,
            EndDate = recurringTask.EndDate
        };
    }
}

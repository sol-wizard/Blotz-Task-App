using System.Text.Json.Serialization;
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

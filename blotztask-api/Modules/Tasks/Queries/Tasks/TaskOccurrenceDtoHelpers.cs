using System.Text.Json.Serialization;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class RecurringOccurrenceIdentityDto
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly OccurrenceDate { get; init; }
}

public abstract class TaskOccurrenceDtoBase
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public TaskOccurrenceKind OccurrenceKind { get; set; }

    public RecurringOccurrenceIdentityDto? RecurringOccurrence { get; set; }
}

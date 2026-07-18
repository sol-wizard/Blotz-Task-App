using System.Text.Json.Serialization;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.ChatTaskGenerator.Dtos;

/// <summary>
///     SPIKE (#1462, throwaway): a single extracted recurring task from user input.
///     Parallel to <see cref="ExtractedTask"/> but carries the recurrence schema the model filled.
///     Times are naive local wall-clock (like ExtractedTask); the timezone/offset and LabelId are
///     resolved at save time (client, or the dev eval harness), mirroring the one-off draft pipeline.
/// </summary>
public class ExtractedRecurringTask
{
    public Guid Id { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = "";

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    // Property-level string-enum converter: the SignalR payload does not inherit the controllers'
    // global JsonStringEnumConverter, so without this frequency/time_type would serialize as ints
    // (inconsistent with task_label). Scoped to this spike DTO to avoid touching the domain enums.
    [JsonPropertyName("time_type")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public TaskTimeType TimeType { get; set; }

    [JsonPropertyName("task_label")]
    public LabelNameEnum LabelName { get; set; }

    /// <summary>First occurrence start, local wall-clock. Its date part is expected to equal <see cref="StartDate"/>.</summary>
    [JsonPropertyName("template_start_time")]
    public DateTime TemplateStartTime { get; set; }

    /// <summary>First occurrence end, local wall-clock. Equals TemplateStartTime for SingleTime.</summary>
    [JsonPropertyName("template_end_time")]
    public DateTime TemplateEndTime { get; set; }

    [JsonPropertyName("frequency")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public RecurrenceFrequency Frequency { get; set; }

    [JsonPropertyName("interval")]
    public int Interval { get; set; } = 1;

    /// <summary>Weekly-only bitmask (Mon=1..Sun=64). Null for non-weekly.</summary>
    [JsonPropertyName("days_of_week")]
    public int? DaysOfWeek { get; set; }

    /// <summary>Monthly-only day of month (1-31). Null otherwise.</summary>
    [JsonPropertyName("day_of_month")]
    public int? DayOfMonth { get; set; }

    [JsonPropertyName("start_date")]
    public DateOnly StartDate { get; set; }

    [JsonPropertyName("end_date")]
    public DateOnly? EndDate { get; set; }
}

using System.Text;
using System.Text.Json;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Application.Queries;

/// <summary>Projects the existing task-calendar query into a bounded model-facing read result.</summary>
public sealed class TaskContextReader(GetTasksByDateQueryHandler tasks, IOptions<AiCoachModuleOptions> options,
    TimeProvider clock)
{
    public const int MaxDays = 7;
    public const int MaxItems = 50;
    // Chinese titles stay readable instead of six-byte \u escapes; nulls are dropped.
    private static readonly JsonSerializerOptions ResultJson = new()
    {
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task<string> ReadAsync(Guid userId, string timeZoneId,
        DateOnly startDate, DateOnly endDate, CancellationToken ct)
    {
        if (userId == Guid.Empty) throw new ArgumentException("A signed-in user is required.", nameof(userId));
        if (endDate < startDate || endDate.DayNumber - startDate.DayNumber >= MaxDays)
            throw new ArgumentException($"Choose a date range of 1 to {MaxDays} days.");

        var zone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        var now = clock.GetUtcNow();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var scheduled = new List<(DateOnly Date, Dictionary<string, object> Item)>();
        var overdue = new List<(DateOnly Date, Dictionary<string, object> Item)>();
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            var entries = await tasks.Handle(new GetTasksByDateQuery
            {
                UserId = userId,
                Date = date,
                TimeZoneId = timeZoneId,
            }, ct);

            foreach (var task in entries)
            {
                var identity = task.Id is { } id
                    ? $"task:{id}"
                    : $"recurrence:{task.RecurringOccurrence?.RecurringTaskId}:{task.RecurringOccurrence?.OccurrenceDate}";
                if (!seen.Add(identity)) continue;

                var isOverdue = !task.IsDone && task.EndTime is { } end && end < now;
                // Only fields that carry information: false flags and empty times are left out to fit more tasks.
                var item = new Dictionary<string, object> { ["title"] = task.Title };
                var start = task.StartTime is { } startTime ? TimeZoneInfo.ConvertTime(startTime, zone) : (DateTimeOffset?)null;
                var finish = task.EndTime is { } endTime ? TimeZoneInfo.ConvertTime(endTime, zone) : (DateTimeOffset?)null;
                if (start is { } from)
                    item["time"] = finish is not { } to ? from.ToString("yyyy-MM-dd HH:mm")
                        : from.Date == to.Date ? $"{from:yyyy-MM-dd HH:mm}-{to:HH:mm}"
                        : $"{from:yyyy-MM-dd HH:mm} to {to:yyyy-MM-dd HH:mm}";
                else if (finish is { } until) item["time"] = "until " + until.ToString("yyyy-MM-dd HH:mm");
                if (task.DueAt is { } due) item["due"] = TimeZoneInfo.ConvertTime(due, zone).ToString("yyyy-MM-dd HH:mm");
                if (task.IsDone) item["done"] = true;
                if (task.RecurringOccurrence is not null) item["recurring"] = true;
                if (isOverdue) item["overdue"] = true;
                if (isOverdue) overdue.Add((date, item));
                else scheduled.Add((date, item));
            }
        }

        var all = scheduled.Concat(overdue).ToArray();
        var selected = new List<Dictionary<string, object>>();
        var maxBytes = options.Value.TaskReadBytes;
        string Serialize(bool truncated)
        {
            // Tells the model where the shown part ends, so its one remaining read can cover the rest.
            var lastShown = truncated && selected.Count > 0 ? all[selected.Count - 1].Date : (DateOnly?)null;
            return JsonSerializer.Serialize(new
            {
                success = true,
                startDate = startDate.ToString("yyyy-MM-dd"),
                endDate = endDate.ToString("yyyy-MM-dd"),
                asOf = TimeZoneInfo.ConvertTime(now, zone).ToString("yyyy-MM-dd HH:mm"),
                timeZoneId,
                truncated,
                omittedCount = truncated ? all.Length - selected.Count : (int?)null,
                note = lastShown is { } shownDate
                    ? $"Not everything fits. Shown items run through {shownDate:yyyy-MM-dd}, and that day may be incomplete; " +
                      $"read {shownDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd} to see the rest."
                    : null,
                items = selected,
            }, ResultJson);
        }
        foreach (var (_, item) in all.Take(MaxItems))
        {
            selected.Add(item);
            if (Encoding.UTF8.GetByteCount(Serialize(true)) <= maxBytes) continue;
            selected.RemoveAt(selected.Count - 1);
            break;
        }
        return Serialize(selected.Count < all.Length);
    }
}

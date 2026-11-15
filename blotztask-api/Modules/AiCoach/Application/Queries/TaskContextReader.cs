using System.Text;
using System.Text.Json;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Application.Queries;

/// <summary>Projects the existing task-calendar query into a bounded model-facing read result.</summary>
public sealed class TaskContextReader(GetTasksByDateQueryHandler tasks, IOptions<AiCoachModuleOptions> options,
    TimeProvider clock)
{
    public const int MaxDays = 7;
    // The byte cap is what normally binds; this only bounds the work of fitting items under it.
    public const int MaxItems = 200;
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
        var scheduled = new List<(DateOnly Date, string Item)>();
        var overdue = new List<(DateOnly Date, string Item)>();
        var busy = new List<(DateTime From, DateTime Until)>();
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
                // Same rule as the draft schedule check, so a free slot never comes back as a conflict.
                if (!task.IsDone && task.TimeType == TaskTimeType.RangeTime
                    && task.StartTime is { } busyFrom && task.EndTime is { } busyUntil && busyFrom < busyUntil)
                    busy.Add((TimeZoneInfo.ConvertTime(busyFrom, zone).DateTime, TimeZoneInfo.ConvertTime(busyUntil, zone).DateTime));
                // One line per task under its date, flags only when set: a busy week read as objects that repeated
                // the date and key names was cut off, and the coach spent a second read and model call on the rest.
                var start = task.StartTime is { } startTime ? TimeZoneInfo.ConvertTime(startTime, zone) : (DateTimeOffset?)null;
                var finish = task.EndTime is { } endTime ? TimeZoneInfo.ConvertTime(endTime, zone) : (DateTimeOffset?)null;
                var line = new StringBuilder();
                // A task that starts and ends at the same minute is a timed reminder; "20:58-20:58" read as
                // an empty range, and the coach left such tasks out when saying when the user is free.
                if (start is { } from)
                    line.Append(finish is not { } to || to == from ? $"{from:HH:mm} (reminder)"
                        : from.Date == to.Date ? $"{from:HH:mm}-{to:HH:mm}"
                        : $"{from:HH:mm} to {to:yyyy-MM-dd HH:mm}").Append(' ');
                else if (finish is { } until) line.Append($"until {until:yyyy-MM-dd HH:mm} ");
                line.Append(task.Title);
                if (task.DueAt is { } due) line.Append($" [due {TimeZoneInfo.ConvertTime(due, zone):yyyy-MM-dd HH:mm}]");
                if (task.IsDone) line.Append(" [done]");
                if (task.RecurringOccurrence is not null) line.Append(" [recurring]");
                if (isOverdue) line.Append(" [overdue]");
                var item = line.ToString();
                if (isOverdue) overdue.Add((date, item));
                else scheduled.Add((date, item));
            }
        }

        // Worked out from every task, so it stays complete when the item list is cut.
        var free = FreeSlots(startDate, endDate, busy, TimeZoneInfo.ConvertTime(now, zone).DateTime);
        // Overdue items come last so a cut drops them first; the output still lists every shown item under its date.
        var all = scheduled.Concat(overdue).ToArray();
        var selected = new List<(DateOnly Date, string Item)>();
        var maxBytes = options.Value.TaskReadBytes;
        string Serialize(bool truncated)
        {
            // Tells the model where the shown part ends, so its one remaining read can cover the rest.
            var lastShown = truncated && selected.Count > 0 ? all[selected.Count - 1].Date : (DateOnly?)null;
            var days = new SortedDictionary<string, List<string>>(StringComparer.Ordinal);
            foreach (var (date, item) in selected)
            {
                var key = date.ToString("yyyy-MM-dd");
                if (!days.TryGetValue(key, out var lines)) days[key] = lines = [];
                lines.Add(item);
            }
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
                      $"read {shownDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd} to see the rest. Once you have, the two " +
                      "results together are complete: do not tell the user that anything was left out."
                    : null,
                // Times are local and on the date they are listed under.
                days,
                free,
            }, ResultJson);
        }
        foreach (var entry in all.Take(MaxItems))
        {
            selected.Add(entry);
            if (Encoding.UTF8.GetByteCount(Serialize(true)) <= maxBytes) continue;
            selected.RemoveAt(selected.Count - 1);
            break;
        }
        return Serialize(selected.Count < all.Length);
    }

    // Waking hours the coach plans within; the user's own routines and wishes still decide which slot fits.
    private static readonly TimeOnly DayStart = new(7, 0);
    private static readonly TimeOnly DayEnd = new(22, 0);
    private static readonly TimeSpan MinFree = TimeSpan.FromMinutes(30);

    /// <summary>
    /// Gaps of at least 30 minutes between 07:00 and 22:00 that no unfinished timed task covers, per date. Picking
    /// a slot from 100+ task lines, the coach guessed busy times and spent a model call on each conflict it hit.
    /// </summary>
    public static SortedDictionary<string, List<string>> FreeSlots(DateOnly startDate, DateOnly endDate,
        IReadOnlyList<(DateTime From, DateTime Until)> busy, DateTime localNow)
    {
        var free = new SortedDictionary<string, List<string>>(StringComparer.Ordinal);
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            var dayEnd = date.ToDateTime(DayEnd);
            var cursor = date.ToDateTime(DayStart);
            if (date < DateOnly.FromDateTime(localNow)) continue;
            // Today's slots start from now, rounded up to the next quarter hour.
            var quarter = TimeSpan.FromMinutes(15).Ticks;
            if (localNow > cursor) cursor = new DateTime((localNow.Ticks + quarter - 1) / quarter * quarter);
            var slots = new List<string>();
            foreach (var (from, until) in busy.Where(value => value.Until > cursor && value.From < dayEnd).OrderBy(value => value.From))
            {
                if (from - cursor >= MinFree) slots.Add($"{cursor:HH:mm}-{from:HH:mm}");
                if (until > cursor) cursor = until;
            }
            if (dayEnd - cursor >= MinFree) slots.Add($"{cursor:HH:mm}-{dayEnd:HH:mm}");
            free[date.ToString("yyyy-MM-dd")] = slots;
        }
        return free;
    }
}

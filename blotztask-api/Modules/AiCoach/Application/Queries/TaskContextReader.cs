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

    public async Task<string> ReadAsync(Guid userId, string timeZoneId,
        DateOnly startDate, DateOnly endDate, CancellationToken ct)
    {
        if (userId == Guid.Empty) throw new ArgumentException("A signed-in user is required.", nameof(userId));
        if (endDate < startDate || endDate.DayNumber - startDate.DayNumber >= MaxDays)
            throw new ArgumentException($"Choose a date range of 1 to {MaxDays} days.");

        var zone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        var now = clock.GetUtcNow();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var scheduled = new List<object>();
        var overdue = new List<object>();
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
                var item = new
                {
                    title = task.Title,
                    start = task.StartTime is { } start
                        ? TimeZoneInfo.ConvertTime(start, zone).ToString("yyyy-MM-dd HH:mm") : null,
                    end = task.EndTime is { } finish
                        ? TimeZoneInfo.ConvertTime(finish, zone).ToString("yyyy-MM-dd HH:mm") : null,
                    done = task.IsDone,
                    due = task.DueAt is { } due
                        ? TimeZoneInfo.ConvertTime(due, zone).ToString("yyyy-MM-dd HH:mm") : null,
                    recurring = task.RecurringOccurrence is not null,
                    overdue = isOverdue,
                };
                if (isOverdue) overdue.Add(item);
                else scheduled.Add(item);
            }
        }

        var all = scheduled.Concat(overdue).ToArray();
        var selected = new List<object>();
        var maxBytes = Math.Min(3000, options.Value.ContextTokenBudget / 8);
        string Serialize(bool truncated) => JsonSerializer.Serialize(new
        {
            success = true,
            startDate = startDate.ToString("yyyy-MM-dd"),
            endDate = endDate.ToString("yyyy-MM-dd"),
            asOf = TimeZoneInfo.ConvertTime(now, zone).ToString("yyyy-MM-dd HH:mm"),
            timeZoneId,
            truncated,
            items = selected,
        });
        foreach (var item in all.Take(MaxItems))
        {
            selected.Add(item);
            if (Encoding.UTF8.GetByteCount(Serialize(true)) <= maxBytes) continue;
            selected.RemoveAt(selected.Count - 1);
            break;
        }
        return Serialize(selected.Count < all.Length);
    }
}

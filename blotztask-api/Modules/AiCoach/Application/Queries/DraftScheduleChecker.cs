using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using System.Security.Cryptography;
using System.Text;

namespace BlotzTask.Modules.AiCoach.Application.Queries;

/// <summary>Checks complete calendar query results. This is advisory: another write may happen after the check.</summary>
public sealed class DraftScheduleChecker(GetTasksByDateQueryHandler tasks,
    RecurringTaskGeneratorService recurrenceGenerator, TimeProvider clock,
    ILogger<DraftScheduleChecker> logger)
{
    public async Task<ScheduleAssessment> CheckAsync(Guid userId, IReadOnlyList<TaskProposal> proposals,
        bool startNow, CancellationToken ct)
    {
        var checkedAt = clock.GetUtcNow();
        var scope = startNow ? "start_now" : "scheduled";
        var windows = new List<(TaskProposal Item, DateTimeOffset Start, DateTimeOffset End)>();
        try
        {
            foreach (var item in proposals.Where(item => !item.PersistedTaskId.HasValue))
            {
                if (item.Date is not { } date || item.StartTime is not { } start || item.EndTime is not { } end)
                    return new("incomplete", checkedAt, [], Scope: scope);
                var dates = new List<DateOnly>();
                if (item.Recurrence is { } recurrence)
                {
                    var template = new RecurringTask
                    {
                        SeriesId = 0, UserId = userId, Title = item.Title,
                        TimeType = TaskTimeType.RangeTime, TemplateStartTime = checkedAt,
                        ScheduleTimeZoneId = item.TimeZoneId, StartDate = date, EndDate = recurrence.EndDate,
                        Pattern = new RecurrencePattern
                        {
                            Frequency = recurrence.Frequency, Interval = recurrence.Interval,
                            DaysOfWeek = recurrence.DaysOfWeek, DayOfMonth = recurrence.DayOfMonth,
                        },
                    };
                    for (var offset = 0; offset < 7; offset++)
                    {
                        var candidate = date.AddDays(offset);
                        if (recurrenceGenerator.IsOccurrenceOn(template, candidate)) dates.Add(candidate);
                    }
                }
                else dates.Add(date);
                var zone = TimeZoneInfo.FindSystemTimeZoneById(item.TimeZoneId);
                foreach (var occurrenceDate in dates)
                {
                    var from = DraftEditing.ResolveLocal(occurrenceDate, start, zone);
                    var until = DraftEditing.ResolveLocal(occurrenceDate, end, zone);
                    if (startNow)
                    {
                        var duration = until - from;
                        from = checkedAt;
                        until = from + duration;
                    }
                    windows.Add((item, from, until));
                }
            }

            if (windows.Count > 50 || windows.SelectMany(window => Days(window.Start, window.End,
                    TimeZoneInfo.FindSystemTimeZoneById(window.Item.TimeZoneId))).Distinct().Count() > 50)
                return new("unverified", checkedAt, [], Scope: scope);
            var conflicts = new List<ScheduleConflict>();
            foreach (var group in windows.GroupBy(window => window.Item.TimeZoneId))
            {
                var zone = TimeZoneInfo.FindSystemTimeZoneById(group.Key);
                var dates = group.SelectMany(window => Days(window.Start, window.End, zone)).Distinct();
                foreach (var date in dates)
                {
                    var entries = await tasks.Handle(new GetTasksByDateQuery
                    {
                        UserId = userId, Date = date, TimeZoneId = group.Key,
                    }, ct);
                    foreach (var window in group)
                    foreach (var entry in entries)
                    {
                        if (entry.IsDone || entry.TimeType != TaskTimeType.RangeTime
                            || entry.StartTime is not { } existingStart || entry.EndTime is not { } existingEnd
                            || window.Start >= existingEnd || existingStart >= window.End) continue;
                        var identity = entry.Id?.ToString() ??
                            $"{entry.RecurringOccurrence?.RecurringTaskId}:{entry.RecurringOccurrence?.OccurrenceDate}";
                        if (conflicts.Any(conflict => conflict.ItemId == window.Item.ProposalId
                            && conflict.TaskIdentity == identity && conflict.Start == existingStart
                            && conflict.End == existingEnd)) continue;
                        conflicts.Add(new(window.Item.ProposalId, identity, entry.Title, existingStart, existingEnd));
                        logger.LogInformation("AiCoach schedule conflict for item {ItemId} with task {TaskIdentity}",
                            window.Item.ProposalId, identity);
                    }
                }
            }
            foreach (var left in windows)
            foreach (var right in windows)
            {
                if (left.Item.ProposalId == right.Item.ProposalId || left.Start >= right.End
                    || right.Start >= left.End) continue;
                if (string.CompareOrdinal(left.Item.ProposalId.ToString(), right.Item.ProposalId.ToString()) >= 0) continue;
                conflicts.Add(new(left.Item.ProposalId, $"draft:{right.Item.ProposalId}",
                    right.Item.Title, right.Start, right.End));
                conflicts.Add(new(right.Item.ProposalId, $"draft:{left.Item.ProposalId}",
                    left.Item.Title, left.Start, left.End));
            }
            var token = conflicts.Count == 0 ? null : Convert.ToHexString(SHA256.HashData(
                Encoding.UTF8.GetBytes(scope + "|" + string.Join("|", conflicts
                    .Select(value => $"{value.ItemId}:{value.TaskIdentity}:{value.Start:O}:{value.End:O}")
                    .Order(StringComparer.Ordinal)))));
            return new(conflicts.Count > 0 ? "conflict" : proposals.Any(item => item.Recurrence is not null)
                ? "partial" : "clear", checkedAt, conflicts, token, scope);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "AiCoach schedule check unavailable for user {UserId}", userId);
            return new("unverified", checkedAt, [], Scope: scope);
        }
    }

    private static IEnumerable<DateOnly> Days(DateTimeOffset start, DateTimeOffset end, TimeZoneInfo zone)
    {
        var first = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(start, zone).DateTime);
        var last = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(end.AddTicks(-1), zone).DateTime);
        for (var date = first; date <= last; date = date.AddDays(1)) yield return date;
    }
}

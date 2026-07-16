using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Shared.Time;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetWeeklyTaskAvailabilityRequest
{
    [BindRequired] public DateOnly WeekStart { get; set; }

    [BindRequired] public string TimeZoneId { get; set; } = string.Empty;
}

public class GetWeeklyTaskAvailabilityQuery
{
    [Required] public required Guid UserId { get; init; }

    [Required] public required DateOnly WeekStart { get; init; }

    [Required] public required string TimeZoneId { get; init; }
}

public class GetWeeklyTaskAvailabilityQueryHandler(
    BlotzTaskDbContext db,
    RecurringTaskGeneratorService generatorService,
    ILogger<GetWeeklyTaskAvailabilityQueryHandler> logger)
{
    public async Task<List<DailyTaskIndicatorDto>> Handle(GetWeeklyTaskAvailabilityQuery query,
        CancellationToken ct = default)
    {
        var stopwatch = Stopwatch.StartNew();

        var tz = TimeZoneClock.ResolveOrThrow(query.TimeZoneId);
        var weekStartDate = query.WeekStart;
        var weekEndDate = weekStartDate.AddDays(7);
        var weekStart = TimeZoneClock.StartOfDayUtc(weekStartDate, tz);
        var weekEndExclusive = TimeZoneClock.StartOfDayUtc(weekEndDate, tz);
        var recurrenceLookbackStartDate = weekStartDate.AddDays(-RecurringTaskGeneratorService.MaxRecurringEventDurationDays);

        logger.LogInformation(
            "Fetching weekly task availability for user {UserId} from {WeekStart} to {WeekEnd} (timezone {TimeZoneId})",
            query.UserId, weekStartDate, weekEndDate, query.TimeZoneId);

        var queryStopwatch = Stopwatch.StartNew();

        var tasks = await db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == query.UserId &&
                        t.StartTime < weekEndExclusive &&
                        t.EndTime >= weekStart)
            .Select(t => new
            {
                t.StartTime,
                t.EndTime,
                t.IsDone
            })
            .ToListAsync(ct);

        var recurringOverrides = await db.RecurringOccurrenceOverrides
            .AsNoTracking()
            .Where(o => o.Series.UserId == query.UserId
                && o.OccurrenceDate >= recurrenceLookbackStartDate
                && o.OccurrenceDate < weekEndDate
                && o.OverrideType != RecurringOccurrenceOverrideType.Detached)
            .Select(o => new
            {
                o.RecurringTaskId,
                o.OccurrenceDate
            })
            .ToListAsync(ct);

        var recurringOverrideKeys = recurringOverrides
            .Select(o => (o.RecurringTaskId, o.OccurrenceDate))
            .ToHashSet();

        var recurringTasks = await db.RecurringTasks
            .AsNoTracking()
            .Include(r => r.Series)
            .Where(r => r.UserId == query.UserId
                && r.IsActive
                && !r.Series.IsDeleted
                && r.StartDate <= weekEndDate
                && (r.EndDate == null || r.EndDate >= recurrenceLookbackStartDate))
            .ToListAsync(ct);

        logger.LogInformation(
            "Fetched {TaskCount} stored tasks, {RecurringCount} recurring templates for user {UserId} (DB query {DbElapsedMs}ms)",
            tasks.Count, recurringTasks.Count, query.UserId, queryStopwatch.ElapsedMilliseconds);

        var result = new List<DailyTaskIndicatorDto>();

        for (var dayDate = weekStartDate; dayDate < weekEndDate; dayDate = dayDate.AddDays(1))
        {
            var dayStart = TimeZoneClock.StartOfDayUtc(dayDate, tz);
            var dayEnd = TimeZoneClock.StartOfDayUtc(dayDate.AddDays(1), tz);

            var hasTask = tasks.Any(t => t.StartTime < dayEnd && t.EndTime >= dayStart && !t.IsDone);

            if (!hasTask)
            {
                hasTask = recurringTasks.Any(r =>
                    generatorService.GetOccurrencesOverlappingWindow(r, dayDate, dayStart, dayEnd)
                        .Any(o => !recurringOverrideKeys.Contains((r.Id, o.OccurrenceDate))));
            }

            result.Add(new DailyTaskIndicatorDto
            {
                Date = dayDate,
                HasTask = hasTask
            });
        }

        logger.LogInformation(
            "Computed weekly task availability for user {UserId} in {ElapsedMs}ms",
            query.UserId, stopwatch.ElapsedMilliseconds);

        return result;
    }
}

public class DailyTaskIndicatorDto
{
    public DateOnly Date { get; set; }
    public bool HasTask { get; set; }
}

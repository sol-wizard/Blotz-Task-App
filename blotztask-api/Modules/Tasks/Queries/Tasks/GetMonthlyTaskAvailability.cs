using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Shared.Time;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetMonthlyTaskAvailabilityRequest
{
    [BindRequired] public DateOnly FirstDate { get; set; }

    [BindRequired] public string TimeZoneId { get; set; } = string.Empty;
}

public class GetMonthlyTaskAvailabilityQuery
{
    [Required] public required Guid UserId { get; init; }

    [Required] public required DateOnly FirstDate { get; init; }

    [Required] public required string TimeZoneId { get; init; }
}

public class GetMonthlyTaskAvailabilityQueryHandler(
    BlotzTaskDbContext db,
    RecurringTaskGeneratorService generatorService,
    ILogger<GetMonthlyTaskAvailabilityQueryHandler> logger)
{
    public async Task<List<MonthlyTaskIndicatorDto>> Handle(GetMonthlyTaskAvailabilityQuery query,
        CancellationToken ct = default)
    {
        var stopwatch = Stopwatch.StartNew();

        var tz = TimeZoneClock.ResolveOrThrow(query.TimeZoneId);
        var monthStartDate = query.FirstDate;
        var monthEndDate = monthStartDate.AddMonths(1);
        var monthStart = TimeZoneClock.StartOfDayUtc(monthStartDate, tz);
        var monthEnd = TimeZoneClock.StartOfDayUtc(monthEndDate, tz);
        var recurrenceLookbackStartDate = monthStartDate.AddDays(-RecurringTaskGeneratorService.MaxRecurringEventDurationDays);
        var userToday = TimeZoneClock.Today(tz);
        var includeOverdueTasks = monthStartDate <= userToday;

        bool? autoRolloverEnabled = await db.UserPreferences
            .AsNoTracking()
            .Where(p => p.UserId == query.UserId)
            .Select(p => p.AutoRollover)
            .FirstOrDefaultAsync(ct);
        var autoRollover = autoRolloverEnabled ?? true;

        logger.LogInformation(
            "Fetching monthly task availability for user {UserId} from {MonthStart} to {MonthEnd} (timezone {TimeZoneId})",
            query.UserId, monthStartDate, monthEndDate, query.TimeZoneId);

        var queryStopwatch = Stopwatch.StartNew();

        var tasks = await db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == query.UserId &&
                        t.StartTime < monthEnd &&
                        t.EndTime >= monthStart)
            .Select(t => new
            {
                t.Title,
                t.StartTime,
                t.EndTime,
                t.IsDone,
                t.Label
            })
            .ToListAsync(ct);

        var recurringOverrides = await db.RecurringOccurrenceOverrides
            .AsNoTracking()
            .Where(o => o.Series.UserId == query.UserId
                && o.OccurrenceDate >= recurrenceLookbackStartDate
                && o.OccurrenceDate < monthEndDate
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
            .Include(r => r.Label)
            .Include(r => r.Series)
            .Where(r => r.UserId == query.UserId
                        && r.IsActive
                        && !r.Series.IsDeleted
                        && r.StartDate <= monthEndDate
                        && (r.EndDate == null || r.EndDate >= recurrenceLookbackStartDate))
            .ToListAsync(ct);

        logger.LogInformation(
            "Fetched {TaskCount} stored tasks, {RecurringCount} recurring templates for user {UserId} (DB query {DbElapsedMs}ms)",
            tasks.Count, recurringTasks.Count, query.UserId, queryStopwatch.ElapsedMilliseconds);

        var result = new List<MonthlyTaskIndicatorDto>();

        for (var dayDate = monthStartDate; dayDate < monthEndDate; dayDate = dayDate.AddDays(1))
        {
            var dayStart = TimeZoneClock.StartOfDayUtc(dayDate, tz);
            var dayEnd = TimeZoneClock.StartOfDayUtc(dayDate.AddDays(1), tz);
            var isToday = dayDate == userToday;
            var overdueCutoff = isToday ? DateTimeOffset.UtcNow : dayEnd;

            var dayTasks = tasks
                .Where(t =>
                    (t.StartTime < dayEnd && t.EndTime >= dayStart) ||
                    (
                        includeOverdueTasks && autoRollover &&
                        dayDate <= userToday &&
                        !t.IsDone &&
                        t.EndTime < overdueCutoff
                    ))
                .OrderBy(t => t.StartTime)
                .Select(t => new TaskThumbnailDto
                {
                    TaskTitle = t.Title,
                    Label = t.Label
                })
                .Take(4)
                .ToList();

            if (dayTasks.Count < 4)
            {
                var offset = 4 - dayTasks.Count;
                var recurringThumbnails = recurringTasks
                    .Where(r => generatorService.GetOccurrencesOverlappingWindow(r, dayDate, dayStart, dayEnd)
                        .Any(o => !recurringOverrideKeys.Contains((r.Id, o.OccurrenceDate))))
                    .OrderBy(r => r.TemplateStartTime)
                    .Select(r => new TaskThumbnailDto
                    {
                        TaskTitle = r.Title,
                        Label = r.Label
                    })
                    .Take(offset)
                    .ToList();

                dayTasks.AddRange(recurringThumbnails);
            }

            result.Add(new MonthlyTaskIndicatorDto
            {
                TaskThumbnails = dayTasks,
                Date = dayDate,
            });
        }

        logger.LogInformation(
            "Computed monthly task availability for user {UserId} in {ElapsedMs}ms",
            query.UserId, stopwatch.ElapsedMilliseconds);

        return result;
    }
}

public class MonthlyTaskIndicatorDto
{
    public DateOnly Date { get; set; }
    public List<TaskThumbnailDto> TaskThumbnails { get; set; } = [];
}

public class TaskThumbnailDto
{
    public string TaskTitle { get; set; } = string.Empty;
    public Label? Label { get; set; }
}

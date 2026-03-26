using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetWeeklyTaskAvailabilityRequest
{
    [BindRequired] public DateTimeOffset Monday { get; set; }
}

public class GetWeeklyTaskAvailabilityQuery
{
    [Required] public required Guid UserId { get; init; }

    [BindRequired] public DateTimeOffset Monday { get; set; }
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
        var weekStart = query.Monday;
        var weekEndExclusive = query.Monday.AddDays(7);
        var weekStartDate = DateOnly.FromDateTime(weekStart.Date);
        var weekEndDate = DateOnly.FromDateTime(weekEndExclusive.Date);

        var userNow = DateTimeOffset.UtcNow.ToOffset(query.Monday.Offset);
        var userTodayStart = new DateTimeOffset(userNow.Date, query.Monday.Offset);
        var userTodayEnd = userTodayStart.AddDays(1);
        var includeOverdueTasks = weekStart.Date <= userNow.Date;

        logger.LogInformation(
            "Fetching weekly task availability for user {UserId} from {weekStart} to {weekEndExclusive}",
            query.UserId,
            weekStart,
            weekEndExclusive);

        var queryStopwatch = Stopwatch.StartNew();

        // Fetch stored TaskItems for this week
        var tasks = await db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == query.UserId &&
                        (
                            // Tasks in date range
                            (
                                t.StartTime < weekEndExclusive
                                && t.EndTime > weekStart
                            )
                            ||
                            // Overdue tasks for today/past views only.
                            (
                                includeOverdueTasks
                                && !t.IsDone
                                && t.EndTime < userNow
                            )
                        ))
            .Select(t => new
            {
                t.StartTime,
                t.EndTime,
                t.IsDone
            })
            .ToListAsync(ct);

        // Fetch active RecurringTasks that could have occurrences in this week
        var recurringTasks = await db.RecurringTasks
            .AsNoTracking()
            .Where(r => r.UserId == query.UserId
                && r.IsActive
                && r.StartDate <= weekEndDate
                && (r.EndDate == null || r.EndDate >= weekStartDate))
            .ToListAsync(ct);

        logger.LogInformation(
            "Fetched {TaskCount} stored tasks, {RecurringCount} recurring templates for user {UserId} (DB query {DbElapsedMs}ms)",
            tasks.Count,
            recurringTasks.Count,
            query.UserId,
            queryStopwatch.ElapsedMilliseconds);

        var result = new List<DailyTaskIndicatorDto>();

        for (var dayStart = weekStart; dayStart < weekEndExclusive; dayStart = dayStart.AddDays(1))
        {
            var dayEnd = dayStart.AddDays(1);
            var dayDate = DateOnly.FromDateTime(dayStart.Date);
            var isToday = dayStart.Date == userNow.Date;
            var overdueCutoff = isToday ? userNow : dayEnd;

            var hasTask = tasks.Any(t =>
            {
                // Tasks in date range
                if (t.StartTime < dayEnd && t.EndTime >= dayStart) return true;

                // Overdue tasks should only decorate today/past cells, using the selected day's cutoff.
                if (
                    includeOverdueTasks
                    && dayStart < userTodayEnd
                    && !t.IsDone
                    && t.EndTime < overdueCutoff
                    )
                {
                    return true;
                }
                return false;
            });

            // If no stored task found, check if any recurring task occurs on this day
            if (!hasTask)
            {
                hasTask = recurringTasks.Any(r => generatorService.IsOccurrenceOn(r, dayDate));
            }

            result.Add(new DailyTaskIndicatorDto
            {
                Date = dayStart,
                HasTask = hasTask
            });
        }

        logger.LogInformation(
            "Computed weekly task availability for user {UserId} in {ElapsedMs}ms",
            query.UserId,
            stopwatch.ElapsedMilliseconds);

        return result;
    }
}

public class DailyTaskIndicatorDto
{
    public DateTimeOffset Date { get; set; }
    public bool HasTask { get; set; }
}

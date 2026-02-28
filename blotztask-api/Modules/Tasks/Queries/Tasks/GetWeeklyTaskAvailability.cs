using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using BlotzTask.Infrastructure.Data;
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
    ILogger<GetWeeklyTaskAvailabilityQueryHandler> logger)
{
    public async Task<List<DailyTaskIndicatorDto>> Handle(GetWeeklyTaskAvailabilityQuery query,
        CancellationToken ct = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var weekStart = query.Monday;

        var weekEndExclusive = query.Monday.AddDays(7);

        var userNow = DateTimeOffset.UtcNow.ToOffset(query.Monday.Offset);
        var userTodayStart = new DateTimeOffset(userNow.Date, query.Monday.Offset);
        var userTodayEnd = userTodayStart.AddDays(1);
        var sevenDayWindowStart = userTodayEnd.AddDays(-7);

        logger.LogInformation(
            "Fetching weekly task availability for user {UserId} from {weekStart} to {weekEndExclusive}",
            query.UserId,
            weekStart,
            weekEndExclusive);

        var queryStopwatch = Stopwatch.StartNew();
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
                            // Overdue tasks within 7 days (matching GetTasksByDateQuery)
                            (
                               !t.IsDone
                                && t.EndTime < userNow
                                && t.EndTime >= sevenDayWindowStart
                            )
                        ))
            .Select(t => new
            {
                t.StartTime,
                t.EndTime,
                t.CreatedAt,
                t.IsDone
            })
            .ToListAsync(ct);
        logger.LogInformation(
            "Fetched {TaskCount} tasks for weekly availability for user {UserId} (DB query {DbElapsedMs}ms)",
            tasks.Count,
            query.UserId,
            queryStopwatch.ElapsedMilliseconds);

        var result = new List<DailyTaskIndicatorDto>();

        for (var dayStart = weekStart; dayStart < weekEndExclusive; dayStart = dayStart.AddDays(1))
        {
            var dayEnd = dayStart.AddDays(1);

            var hasTask = tasks.Any(t =>
            {
                    // Tasks in date range
                    if (t.StartTime < dayEnd && t.EndTime >= dayStart) return true;

                    // Overdue tasks within 7 days
                    if (
                        dayStart < userTodayEnd && dayStart >= sevenDayWindowStart
                        && t.StartTime < dayEnd && t.EndTime >= sevenDayWindowStart
                        && !t.IsDone && t.EndTime < userNow
                        )
                    {
                        return true;
                    }
                    return false;
            });

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

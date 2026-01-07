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

        // 用户时区的"今天"
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
                            (t.StartTime != null && t.EndTime != null &&
                             t.StartTime < weekEndExclusive && t.EndTime > weekStart)
                            ||
                            // Floating tasks
                            (t.StartTime == null && t.EndTime == null &&
                             t.CreatedAt >= weekStart &&
                             t.CreatedAt < weekEndExclusive)
                            ||
                            // Overdue tasks within 7 days (matching GetTasksByDateQuery)
                            (t.StartTime != null &&t.EndTime != null
                             && !t.IsDone
                             && t.EndTime < userNow
                             && t.EndTime >= sevenDayWindowStart
                            )
                        ))
            .Select(t => new
            {
                t.Title,
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
            var isFutureDay = dayStart > userNow.Date;

            var hasTask = tasks.Any(t =>
            {
                if (t.StartTime.HasValue && t.EndTime.HasValue)
                {
                    // Tasks in date range
                    if (t.StartTime < dayEnd && t.EndTime >= dayStart) return true;

                    // Overdue tasks within 7 days
                    if (!isFutureDay && !t.IsDone && t.EndTime < userNow && t.StartTime < dayEnd && t.EndTime >= sevenDayWindowStart && dayStart >= sevenDayWindowStart)
                    {
                        Console.WriteLine($"Overdue task: {t.Title} {t.StartTime} {t.EndTime} {isFutureDay} {dayStart} {dayEnd} {sevenDayWindowStart}");
                        return true;
                    }

                }

                return false;
            });

            result.Add(new DailyTaskIndicatorDto
            {
                Date = dayStart,
                HasTask = hasTask
            });
            // Console.WriteLine($"results are: {string.Join(", ", result.Select(r => r.Date))}");
            // Console.WriteLine($"results are: {string.Join(", ", result.Select(r => r.HasTask))}");
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

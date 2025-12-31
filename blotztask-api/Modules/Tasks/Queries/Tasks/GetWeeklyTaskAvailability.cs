using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using BlotzTask.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetWeeklyTaskAvailabilityRequest
{
    [BindRequired] public DateTimeOffset MondayUtc { get; set; }
}

public class GetWeeklyTaskAvailabilityQuery
{
    [Required] public required Guid UserId { get; init; }

    [BindRequired] public DateTimeOffset MondayUtc { get; set; }
}

public class GetWeeklyTaskAvailabilityQueryHandler(
    BlotzTaskDbContext db,
    ILogger<GetWeeklyTaskAvailabilityQueryHandler> logger)
{
    public async Task<List<DailyTaskIndicatorDto>> Handle(GetWeeklyTaskAvailabilityQuery query,
        CancellationToken ct = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var startDateUtc = query.MondayUtc;

        var endDateUtcExclusive = query.MondayUtc.AddDays(7);

        var todayEndUtc = DateTime.UtcNow.Date.AddDays(1);
        var sevenDayWindowStartUtc = todayEndUtc.AddDays(-6);
        var userToday = DateTimeOffset.UtcNow.ToOffset(query.MondayUtc.Offset);

        logger.LogInformation(
            "Fetching weekly task availability for user {UserId} from {startDateUtc} to {endDateUtcExclusive}",
            query.UserId,
            startDateUtc,
            endDateUtcExclusive);

        var queryStopwatch = Stopwatch.StartNew();
        var tasks = await db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == query.UserId &&
                        (
                            // Tasks in date range
                            (t.StartTime != null && t.EndTime != null &&
                             t.StartTime < endDateUtcExclusive && t.EndTime > startDateUtc)
                            ||
                            // Floating tasks
                            (t.StartTime == null && t.EndTime == null &&
                             t.CreatedAt >= startDateUtc &&
                             t.CreatedAt < endDateUtcExclusive)
                            ||
                            // Overdue tasks within 7 days (matching GetTasksByDateQuery)
                            (t.StartTime != null &&t.EndTime != null
                             && !t.IsDone
                             && t.EndTime < DateTime.UtcNow
                             && t.EndTime >= sevenDayWindowStartUtc
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

        for (var dayStart = startDateUtc; dayStart < endDateUtcExclusive; dayStart = dayStart.AddDays(1))
        {
            var dayEnd = dayStart.AddDays(1);
            var isFutureDay = dayStart > userToday.Date;

            var hasTask = tasks.Any(t =>
            {
                if (t.StartTime.HasValue && t.EndTime.HasValue)
                {
                    var isInDateRange = t.StartTime < dayEnd && t.EndTime >= dayStart;
                    if (isInDateRange) return true;

                    if (!isFutureDay && !t.IsDone && t.EndTime < DateTime.UtcNow && t.StartTime <= dayEnd)
                    {
                        return true;
                    }

                    return false;
                }

                var createdAtUtc = DateTime.SpecifyKind(t.CreatedAt, DateTimeKind.Utc);
                var createdAtUtcOffset = new DateTimeOffset(createdAtUtc, TimeSpan.Zero);

                return createdAtUtcOffset >= dayStart && createdAtUtcOffset < dayEnd;
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

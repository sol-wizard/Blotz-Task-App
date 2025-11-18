using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetWeeklyTaskAvabilityRequest
{
    [BindRequired] public DateTimeOffset MondayUtc { get; set; }
}

public class GetWeeklyTaskAvabilityQuery
{
    [Required] public required Guid UserId { get; init; }

    [BindRequired] public DateTimeOffset MondayUtc { get; set; }
}

public class GetWeeklyTaskAvabilityQueryHandler(BlotzTaskDbContext db, ILogger<GetWeeklyTaskAvabilityQueryHandler> logger)
{
    public async Task<List<DailyTaskIndicatorDto>> Handle(GetWeeklyTaskAvabilityQuery query, CancellationToken ct = default)
    {
        var startDateUtc = query.MondayUtc;
        var endDateUtcExclusive = query.MondayUtc.Date.AddDays(8);

        logger.LogInformation("Getting task days from {startDateUtc} to {endDateUtcExclusive}", startDateUtc,
            endDateUtcExclusive);


        var tasks = await db.TaskItems
            .Where(t => t.UserId == query.UserId &&
                        (
                            // Tasks in date range
                            (t.StartTime != null && t.EndTime != null && t.StartTime >= startDateUtc &&
                             t.StartTime < endDateUtcExclusive)
                            ||
                            (t.StartTime != null && t.EndTime != null && t.StartTime <= startDateUtc &&
                             t.EndTime > endDateUtcExclusive)
                            ||
                            // Floating tasks
                            (t.StartTime == null && t.EndTime == null &&
                             t.CreatedAt >= startDateUtc &&
                             t.CreatedAt < endDateUtcExclusive)))
            .ToListAsync(ct);

        var result = new List<DailyTaskIndicatorDto>();

        for (var dayStart = startDateUtc; dayStart < endDateUtcExclusive; dayStart = dayStart.AddDays(1))
        {
            var dayEnd = dayStart.AddDays(1);

            var hasTask = tasks.Any(t =>
            {
                if (t.StartTime.HasValue && t.EndTime.HasValue) return t.StartTime < dayEnd && t.EndTime >= dayStart;

                return t.CreatedAt >= dayStart && t.CreatedAt < dayEnd;
            });

            result.Add(new DailyTaskIndicatorDto
            {
                Date = dayStart,
                HasTask = hasTask
            });
        }

        return result;
    }
}

public class DailyTaskIndicatorDto
{
    public DateTimeOffset Date { get; set; }
    public bool HasTask { get; set; }
}
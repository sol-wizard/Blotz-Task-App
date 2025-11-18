using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetTaskDaysRequest
{
    [BindRequired] public DateTimeOffset MondayUtc { get; set; }
}

public class GetTaskDaysQuery
{
    [Required] public required Guid UserId { get; init; }

    [BindRequired] public DateTimeOffset MondayUtc { get; set; }
}

public class GetTaskDaysQueryHandler(BlotzTaskDbContext db, ILogger<GetTaskDaysQueryHandler> logger)
{
    public async Task<List<TaskDayDto>> Handle(GetTaskDaysQuery query, CancellationToken ct = default)
    {
        var startDateUtc = query.MondayUtc;
        var endDateUtcExclusive = query.MondayUtc.Date.AddDays(7);

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

        logger.LogInformation("the length of tasks: {length}", tasks.Count);

        var result = new List<TaskDayDto>();

        for (var dayStart = startDateUtc; dayStart < endDateUtcExclusive; dayStart = dayStart.AddDays(1))
        {
            var dayEnd = dayStart.AddDays(1);

            var hasTask = tasks.Any(t =>
            {
                if (t.StartTime.HasValue && t.EndTime.HasValue) return t.StartTime < dayEnd && t.EndTime > dayStart;

                return t.CreatedAt >= dayStart && t.CreatedAt < dayEnd;
            });

            result.Add(new TaskDayDto
            {
                Date = dayStart,
                HasTask = hasTask
            });
        }

        return result;
    }
}

public class TaskDayDto
{
    public DateTimeOffset Date { get; set; }
    public bool HasTask { get; set; }
}
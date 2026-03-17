using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using BlotzTask.Modules.Labels.Domain;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetMonthlyTaskAvailabilityRequest
{
    [BindRequired] public DateTimeOffset firstDate { get; set; }
}

public class GetMonthlyTaskAvailabilityQuery
{
    [Required] public required Guid UserId { get; init; }
    [BindRequired] public DateTimeOffset firstDate { get; set; }
}

public class GetMonthlyTaskAvailabilityQueryHandler(
    BlotzTaskDbContext db,
    RecurringTaskGeneratorService generatorService,
    ILogger<GetWeeklyTaskAvailabilityQueryHandler> logger)
{
    public async Task<List<MonthlyTaskIndicatorDto>> Handle(GetMonthlyTaskAvailabilityQuery query,
        CancellationToken ct = default)
    {
        var monthStart = query.firstDate;
        var monthEnd = query.firstDate.AddMonths(1);
        var weekStartDate = DateOnly.FromDateTime(monthStart.Date);
        var weekEndDate = DateOnly.FromDateTime(monthEnd.Date);
        
        
        var userNow = DateTimeOffset.UtcNow.ToOffset(query.firstDate.Offset);
        var userTodayStart = new DateTimeOffset(userNow.Date, query.firstDate.Offset);
        var userTodayEnd = userTodayStart.AddDays(1);
        var sevenDayWindowStart = userTodayEnd.AddDays(-7);
        
        var tasks = await db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == query.UserId &&
                        (
                            // Tasks in date range
                            (
                                t.StartTime < monthEnd
                                && t.EndTime > monthStart
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
                t.Title,
                t.StartTime,
                t.EndTime,
                t.IsDone,
                t.Label
            })
            .ToListAsync(ct);
        
        var result = new List<MonthlyTaskIndicatorDto>();

        for (var dayStart = monthStart; dayStart < monthEnd; dayStart = dayStart.AddDays(1))
        {
            var dayEnd = dayStart.AddDays(1);
            var dayDate = DateOnly.FromDateTime(dayStart.Date);

            var dayTasks = tasks
                .Where(t =>
                    (t.StartTime < dayEnd && t.EndTime >= dayStart) ||
                    (
                        dayStart < userTodayEnd &&
                        dayStart >= sevenDayWindowStart &&
                        t.StartTime < dayEnd &&
                        t.EndTime >= sevenDayWindowStart &&
                        !t.IsDone &&
                        t.EndTime < userNow
                    ))
                .Select(t => new TaskThumbnailDto
                {
                    TaskTitle = t.Title,
                    Label = t.Label // set this when you include label in query
                })
                .ToList();

            result.Add(new MonthlyTaskIndicatorDto()
            {
                TaskThumbnails = dayTasks,
                Date = dayStart,
                HasTask = dayTasks.Count > 0
            });
        }
        
        return result;
    }
    
}

public class MonthlyTaskIndicatorDto
{
    public DateTimeOffset Date { get; set; }
    public bool HasTask { get; set; }
    public List<TaskThumbnailDto> TaskThumbnails { get; set; }
}

public class TaskThumbnailDto
{
    public string TaskTitle { get; set; }
    public Label? Label { get; set; }
}



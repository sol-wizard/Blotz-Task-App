using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using BlotzTask.Modules.Labels.Domain;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetMonthlyTaskAvailabilityRequest
{
    [BindRequired] public DateTimeOffset FirstDate { get; set; }
}

public class GetMonthlyTaskAvailabilityQuery
{
    [Required] public required Guid UserId { get; init; }
    [BindRequired] public DateTimeOffset FirstDate { get; set; }
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
        var monthStart = query.FirstDate;
        var monthEnd = query.FirstDate.AddMonths(1);
        var monthStartDate = DateOnly.FromDateTime(monthStart.Date);
        var monthEndDate = DateOnly.FromDateTime(monthEnd.Date);
        
        
        var userNow = DateTimeOffset.UtcNow.ToOffset(query.FirstDate.Offset);
        var userTodayStart = new DateTimeOffset(userNow.Date, query.FirstDate.Offset);
        var userTodayEnd = userTodayStart.AddDays(1);
        var includeOverdueTasks = monthStart.Date <= userNow.Date;
        
        
        logger.LogInformation(
            "Fetching monthly task availability for user {UserId} from {MonthStart} to {MonthEnd}",
            query.UserId,
            monthStart,
            monthEnd);
        
        var queryStopwatch = Stopwatch.StartNew();
        
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
                            // Overdue tasks for today/past views only.
                            (
                                includeOverdueTasks
                                && !t.IsDone
                                && t.EndTime < userNow
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
        
        
        var recurringTasks = await db.RecurringTasks
            .AsNoTracking()
            .Include(r => r.Label)
            .Where(r => r.UserId == query.UserId
                        && r.IsActive
                        && r.StartDate <= monthEndDate
                        && (r.EndDate == null || r.EndDate >= monthStartDate))
            .ToListAsync(ct);

        logger.LogInformation(
            "Fetched {TaskCount} stored tasks, {RecurringCount} recurring templates for user {UserId} (DB query {DbElapsedMs}ms)",
            tasks.Count,
            recurringTasks.Count,
            query.UserId,
            queryStopwatch.ElapsedMilliseconds);
        
        var result = new List<MonthlyTaskIndicatorDto>();

        for (var dayStart = monthStart; dayStart < monthEnd; dayStart = dayStart.AddDays(1))
        {
            var dayEnd = dayStart.AddDays(1);
            var dayDate = DateOnly.FromDateTime(dayStart.Date);
            var isToday = dayStart.Date == userNow.Date;
            var overdueCutoff = isToday ? userNow : dayEnd;

            var dayTasks = tasks
                .Where(t =>
                    (t.StartTime < dayEnd && t.EndTime >= dayStart) ||
                    (
                        includeOverdueTasks &&
                        dayStart < userTodayEnd &&
                        !t.IsDone &&
                        t.EndTime < overdueCutoff
                    ))
                .Select(t => new TaskThumbnailDto
                {
                    TaskTitle = t.Title,
                    Label = t.Label
                })
                .Take(3)
                .ToList();
            
            if (dayTasks.Count < 3)
            {
                var offset = 3 -  dayTasks.Count;
                var recurringThumbnails = recurringTasks
                    .Where(r => generatorService.IsOccurrenceOn(r, dayDate))
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
                Date = dayStart,
            });
        }

        logger.LogInformation(
            "Computed monthly task availability for user {UserId} in {ElapsedMs}ms",
            query.UserId,
            stopwatch.ElapsedMilliseconds);
        
        return result;
    }
    
}

public class MonthlyTaskIndicatorDto
{
    public DateTimeOffset Date { get; set; }
    public List<TaskThumbnailDto> TaskThumbnails { get; set; }
}

public class TaskThumbnailDto
{
    public string TaskTitle { get; set; }
    public Label? Label { get; set; }
}

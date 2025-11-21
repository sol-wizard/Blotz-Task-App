using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Tasks.Enums;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetTasksByDateRequest
{
    [BindRequired] public DateTime StartDateUtc { get; set; }

    [BindRequired] public bool IncludeFloatingForToday { get; set; }
}

public class GetTasksByDateQuery
{
    [Required] public required Guid UserId { get; init; }

    [Required] public DateTime StartDateUtc { get; init; }

    [Required] public bool IncludeFloatingForToday { get; init; } = false;
}

public class GetTasksByDateQueryHandler(BlotzTaskDbContext db, ILogger<GetTasksByDateQueryHandler> logger)
{
    public async Task<List<TaskByDateItemDto>> Handle(GetTasksByDateQuery query, CancellationToken ct = default)
    {
        logger.LogInformation(
            "Fetching tasks by end time for user {UserId} up to {StartDateUtc}. Whether including floating tasks for today is {IncludeFloatingForToday}",
            query.UserId, query.StartDateUtc, query.IncludeFloatingForToday);

        var todayStartUtc = DateTime.UtcNow.Date;
        var todayEndUtc = todayStartUtc.AddDays(1);
        var sevenDayWindowStartUtc = todayEndUtc.AddDays(-6);
        var endDateUtc = query.StartDateUtc.AddDays(1);


        var tasks = await db.TaskItems
            .Where(t => t.UserId == query.UserId &&
                        (
                            // Tasks in date range
                            (t.StartTime != null && t.EndTime != null &&
                             t.StartTime < endDateUtc && t.EndTime >= query.StartDateUtc)
                            ||
                            // Floating tasks
                            (query.IncludeFloatingForToday && t.StartTime == null && t.EndTime == null &&
                             t.CreatedAt >= query.StartDateUtc &&
                             t.CreatedAt < endDateUtc)
                            ||
                            // Overdue tasks within 7 days but not in selected day
                            (t.EndTime != null
                             && !t.IsDone
                             && t.EndTime < DateTime.UtcNow && t.EndTime >= sevenDayWindowStartUtc &&
                             t.StartTime <= endDateUtc
                            )
                        ))
            .OrderBy(t => t.StartTime).ThenBy(t => t.Title)
            .Select(task => new TaskByDateItemDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                TimeType = task.TimeType,
                Label = task.Label != null
                    ? new LabelDto
                    {
                        LabelId = task.Label.LabelId,
                        Name = task.Label.Name,
                        Color = task.Label.Color
                    }
                    : null
            })
            .ToListAsync(ct);

        logger.LogInformation("Successfully fetched {TaskCount} tasks for user {UserId}", tasks.Count, query.UserId);
        return tasks;
    }
}

public class TaskByDateItemDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public LabelDto? Label { get; set; }
    public TaskTimeType? TimeType { get; set; }
}
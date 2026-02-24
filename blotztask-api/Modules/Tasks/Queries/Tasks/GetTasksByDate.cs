using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.SubTasks;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetTasksByDateRequest
{
    [BindRequired] public DateTimeOffset StartDate { get; set; }

    [BindRequired] public bool IncludeFloatingForToday { get; set; }
}

public class GetTasksByDateQuery
{
    [Required] public required Guid UserId { get; init; }

    [Required] public DateTimeOffset StartDate { get; init; }

    [Required] public bool IncludeFloatingForToday { get; init; } = false;
}

public class GetTasksByDateQueryHandler(BlotzTaskDbContext db, ILogger<GetTasksByDateQueryHandler> logger)
{
    public async Task<List<TaskByDateItemDto>> Handle(GetTasksByDateQuery query, CancellationToken ct = default)
    {
        var stopwatch = Stopwatch.StartNew();
        logger.LogInformation(
            "Fetching tasks by end time for user {UserId} up to {StartDate}. Whether including floating tasks for today is {IncludeFloatingForToday}",
            query.UserId, query.StartDate, query.IncludeFloatingForToday);

        bool? autoRolloverEnabled = await db.UserPreferences
            .AsNoTracking()
            .Where(p => p.UserId == query.UserId)
            .Select(p => p.AutoRollover)
            .FirstOrDefaultAsync(ct);
        var autoRollover = autoRolloverEnabled ?? true;

        var selectedDayStart = query.StartDate;
        var selectedDayEnd = query.StartDate.AddDays(1);

        var userNow = DateTimeOffset.UtcNow.ToOffset(query.StartDate.Offset);
        var userTodayStart = userNow.Date;
        var userTodayEnd = userTodayStart.AddDays(1);
        var sevenDayWindowStart = userDayEnd.AddDays(-7);
        var isFutureDay = query.StartDate.Date > userNow.Date;

        logger.LogInformation("StartDate received: {StartDate} (Offset={Offset})", query.StartDate, query.StartDate.Offset);
        logger.LogInformation("Computed window: selectedDayStart={Start}, selectedDayEnd={End}, overdueWindowStart={OverdueStart}",
            selectedDayStart, selectedDayEnd, sevenDayWindowStart);

        var queryStopwatch = Stopwatch.StartNew();
        var tasks = await db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == query.UserId &&
                        (
                            // 1) Tasks that overlap selected day
                            (
                               
                                t.StartTime < selectedDayEnd
                                && t.EndTime >= selectedDayStart
                            )
                            ||
                            // 3) Overdue tasks from [selectedDay-7, selectedDay) ONLY if AutoRollover == true
                            (
                                autoRollover
                                && !isFutureDay
                                && t.EndTime < userNow
                                && !t.IsDone
                                && t.StartTime < selectedDayEnd
                                && t.EndTime >= sevenDayWindowStart
                            )
                        ))
            .OrderBy(t => t.StartTime).ThenBy(t => t.EndTime).ThenBy(t => t.Title)
            .Select(task => new TaskByDateItemDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                TimeType = task.TimeType,
                NotificationId = task.NotificationId,
                AlertTime = task.AlertTime,
                Label = task.Label != null
                    ? new LabelDto
                    {
                        LabelId = task.Label.LabelId,
                        Name = task.Label.Name,
                        Color = task.Label.Color
                    }
                    : null,
                Subtasks = task.Subtasks.OrderBy(st => st.Order).Select(st => new SubtaskDetailDto
                {
                    SubTaskId = st.Id,
                    ParentTaskId = st.ParentTaskId,
                    Title = st.Title,
                    Description = st.Description,
                    Duration = st.Duration,
                    Order = st.Order,
                    IsDone = st.IsDone
                }).ToList()
            })
            .ToListAsync(ct);

        logger.LogInformation(
            "Successfully fetched {TaskCount} tasks for user {UserId} in {ElapsedMs}ms (DB query {DbElapsedMs}ms)",
            tasks.Count,
            query.UserId,
            stopwatch.ElapsedMilliseconds,
            queryStopwatch.ElapsedMilliseconds);
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
    public List<SubtaskDetailDto> Subtasks { get; set; } = [];
    public string? NotificationId { get; set; }
    public DateTimeOffset? AlertTime { get; set; }
}
using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Tasks.Domain.Services;
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

public class GetTasksByDateQueryHandler(
    BlotzTaskDbContext db,
    RecurringTaskGeneratorService generatorService,
    ILogger<GetTasksByDateQueryHandler> logger)
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
        var requestedDate = DateOnly.FromDateTime(query.StartDate.Date);

        var userNow = DateTimeOffset.UtcNow.ToOffset(query.StartDate.Offset);
        var userTodayStart = userNow.Date;
        var userTodayEnd = userTodayStart.AddDays(1);
        var sevenDayWindowStart = userTodayEnd.AddDays(-7);
        var isFutureDay = query.StartDate.Date > userNow.Date;

        logger.LogInformation("StartDate received: {StartDate} (Offset={Offset})", query.StartDate, query.StartDate.Offset);
        logger.LogInformation("Computed window: selectedDayStart={Start}, selectedDayEnd={End}, overdueWindowStart={OverdueStart}",
            selectedDayStart, selectedDayEnd, sevenDayWindowStart);

        var queryStopwatch = Stopwatch.StartNew();

        // Step 1: Fetch stored TaskItems for this date (same logic as before)
        var tasks = await db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == query.UserId &&
                        (
                            // Tasks that overlap selected day
                            (
                                t.StartTime < selectedDayEnd
                                && t.EndTime >= selectedDayStart
                            )
                            ||
                            // Overdue tasks from [selectedDay-7, selectedDay) ONLY if AutoRollover == true
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
                RecurringTaskId = task.RecurringTaskId,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                TimeType = task.TimeType,
                NotificationId = task.NotificationId,
                AlertTime = task.AlertTime,
                IsDeadline = db.TaskDeadlines.Any(td => td.TaskItemId == task.Id),
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
            "Fetched {TaskCount} stored tasks for user {UserId} (DB query {DbElapsedMs}ms)",
            tasks.Count,
            query.UserId,
            queryStopwatch.ElapsedMilliseconds);

        // Step 2: Fetch active RecurringTasks for this user that could occur on requestedDate
        var recurringTasks = await db.RecurringTasks
            .AsNoTracking()
            .Include(r => r.Label)
            .Where(r => r.UserId == query.UserId
                && r.IsActive
                && r.StartDate <= requestedDate
                && (r.EndDate == null || r.EndDate >= requestedDate))
            .ToListAsync(ct);

        // Step 3: Find which recurring templates already have a stored row for this date
        var alreadySavedIds = tasks
            .Where(t => t.RecurringTaskId != null && t.StartTime?.Date == requestedDate.ToDateTime(TimeOnly.MinValue))
            .Select(t => t.RecurringTaskId!.Value)
            .ToHashSet();

        // Step 4: For each recurring task not yet saved, check if it occurs on this date
        foreach (var recurring in recurringTasks)
        {
            if (alreadySavedIds.Contains(recurring.Id)) continue;
            if (!generatorService.IsOccurrenceOn(recurring, requestedDate)) continue;

            var startTime = new DateTimeOffset(
                requestedDate,
                TimeOnly.FromTimeSpan(recurring.TemplateStartTime.TimeOfDay),
                recurring.TemplateStartTime.Offset);

            var endTime = recurring.TimeType == TaskTimeType.SingleTime
                ? startTime
                : new DateTimeOffset(
                    requestedDate,
                    TimeOnly.FromTimeSpan(recurring.TemplateEndTime!.Value.TimeOfDay),
                    recurring.TemplateEndTime.Value.Offset);

            tasks.Add(new TaskByDateItemDto
            {
                Id = null,  // no DB row yet
                RecurringTaskId = recurring.Id,
                Title = recurring.Title,
                Description = recurring.Description,
                StartTime = startTime,
                EndTime = endTime,
                IsDone = false,
                TimeType = recurring.TimeType,
                Label = recurring.Label != null
                    ? new LabelDto
                    {
                        LabelId = recurring.Label.LabelId,
                        Name = recurring.Label.Name,
                        Color = recurring.Label.Color
                    }
                    : null,
                Subtasks = [],
                IsDeadline = false
            });
        }

        // Step 5: Re-sort the merged list because virtual tasks from Step 4 were appended
        // at the end out of order. Sort priority: StartTime → EndTime → Title (alphabetical).
        // e.g. two tasks both at 9am: the one ending at 10am comes before the one ending at 11am;
        // if both start and end at the same time, sort alphabetically by title.
        tasks.Sort((a, b) =>
        {
            var cmp = Nullable.Compare(a.StartTime, b.StartTime);
            if (cmp != 0) return cmp;
            cmp = Nullable.Compare(a.EndTime, b.EndTime);
            if (cmp != 0) return cmp;
            return string.Compare(a.Title, b.Title, StringComparison.Ordinal);
        });

        logger.LogInformation(
            "Successfully fetched {TaskCount} tasks (stored + virtual) for user {UserId} in {ElapsedMs}ms",
            tasks.Count,
            query.UserId,
            stopwatch.ElapsedMilliseconds);

        return tasks;
    }
}

public class TaskByDateItemDto
{
    public int? Id { get; set; }           // null = virtual occurrence (no DB row yet)
    public int? RecurringTaskId { get; set; }
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
    public bool IsDeadline { get; set; }
}

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
    // TIMEZONE TODO: Align with timezone-handling.md Core Rule, Rule 2, Rule 4, and Rule 7.
    // Replace startDate DateTimeOffset calendar queries with local date + request/device timeZoneId.
    // Backend should resolve the local day boundaries from timeZoneId, convert them to UTC,
    // keep the existing overlap logic, and add DST/travel/exact-midnight tests.
    // TIMEZONE TODO: Remove IncludeFloatingForToday from the API/mobile call path because floating
    // task support is no longer used.
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
        var isFutureDay = query.StartDate.Date > userNow.Date;
        var isToday = query.StartDate.Date == userNow.Date;

        var overdueCutoff = isToday ? userNow : selectedDayEnd;


        logger.LogInformation("StartDate received: {StartDate} (Offset={Offset})", query.StartDate, query.StartDate.Offset);
        logger.LogInformation("Computed window: selectedDayStart={Start}, selectedDayEnd={End}, isFutureDay={IsFutureDay}",
            selectedDayStart, selectedDayEnd, isFutureDay);

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
                            // Overdue tasks are included only for today when auto-rollover is enabled.
                            (
                                autoRollover
                                && isToday
                                && t.EndTime < overdueCutoff
                                && !t.IsDone
                            )
                        ))
            .OrderBy(t => t.StartTime).ThenBy(t => t.EndTime).ThenBy(t => t.Title)
            .Select(task => new TaskByDateItemDto
            {
                Id = task.Id,
                OccurrenceKind = TaskOccurrenceDtoHelpers.ToOccurrenceKind(task.RecurringOccurrenceOverride),
                RecurringOccurrence = TaskOccurrenceDtoHelpers.ToRecurringOccurrenceIdentityOrNull(
                    task.RecurringOccurrenceOverride),
                RecurringTask = TaskOccurrenceDtoHelpers.ToRecurringTaskMetadataOrNull(
                    task.RecurringOccurrenceOverride,
                    task.RecurringOccurrenceOverride == null
                        ? null
                        : task.RecurringOccurrenceOverride.RecurringTask),
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                TimeType = task.TimeType,
                NotificationId = task.NotificationId,
                AlertTime = task.AlertTime,
                IsDeadline = task.Deadline != null,
                DueAt = task.Deadline == null ? null : task.Deadline.DueAt,
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

        var recurrenceLookbackStartDate = requestedDate.AddDays(-RecurringTaskGeneratorService.MaxRecurringEventDurationDays);

        // Step 2: Fetch active RecurringTasks for this user that could overlap requestedDate
        var recurringTasks = await db.RecurringTasks
            .AsNoTracking()
            .Include(r => r.Label)
            .Include(r => r.Series)
            .Where(r => r.UserId == query.UserId
                && r.IsActive
                && !r.Series.IsDeleted
                && r.StartDate <= requestedDate
                && (r.EndDate == null || r.EndDate >= recurrenceLookbackStartDate))
            .ToListAsync(ct);

        // Step 3: Find overrides that suppress or replace virtual occurrences that may overlap this date.
        var overrides = await db.RecurringOccurrenceOverrides
            .AsNoTracking()
            .Where(o => o.Series.UserId == query.UserId
                && o.OccurrenceDate >= recurrenceLookbackStartDate
                && o.OccurrenceDate <= requestedDate)
            .ToListAsync(ct);

        var overrideMap = overrides.ToDictionary(o => (o.RecurringTaskId, o.OccurrenceDate), o => o);

        // Step 4: For each recurring task not yet saved, check if it occurs on this date
        foreach (var recurring in recurringTasks)
        {
            var occurrenceWindows = generatorService.GetOccurrencesOverlappingWindow(
                recurring,
                requestedDate,
                selectedDayStart,
                selectedDayEnd);

            foreach (var occurrenceWindow in occurrenceWindows)
            {
                if (overrideMap.TryGetValue(
                        (recurring.Id, occurrenceWindow.OccurrenceDate),
                        out var recurringOverride)
                    && recurringOverride.OverrideType != RecurringOccurrenceOverrideType.Detached)
                {
                    continue;
                }

                tasks.Add(new TaskByDateItemDto
                {
                    Id = null,  // no DB row yet
                    OccurrenceKind = TaskOccurrenceKind.VirtualRecurringOccurrence,
                    RecurringOccurrence = new RecurringOccurrenceIdentityDto
                    {
                        RecurringTaskId = recurring.Id,
                        OccurrenceDate = occurrenceWindow.OccurrenceDate
                    },
                    RecurringTask = new RecurringTaskEditMetadataDto
                    {
                        Frequency = recurring.Pattern.Frequency,
                        Interval = recurring.Pattern.Interval,
                        DaysOfWeek = recurring.Pattern.DaysOfWeek,
                        DayOfMonth = recurring.Pattern.DayOfMonth,
                        StartDate = recurring.StartDate,
                        EndDate = recurring.EndDate
                    },
                    Title = recurring.Title,
                    Description = recurring.Description,
                    StartTime = occurrenceWindow.StartTime,
                    EndTime = occurrenceWindow.EndTime,
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
                    IsDeadline = recurring.IsDeadline,
                    DueAt = recurring.IsDeadline
                        ? generatorService.BuildOccurrenceDueAt(recurring, occurrenceWindow.OccurrenceDate)
                        : null
                });
            }
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

public class TaskByDateItemDto : TaskOccurrenceDtoBase
{
    public int? Id { get; set; }           // null = virtual occurrence (no DB row yet)
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
    public DateTimeOffset? DueAt { get; set; }
}

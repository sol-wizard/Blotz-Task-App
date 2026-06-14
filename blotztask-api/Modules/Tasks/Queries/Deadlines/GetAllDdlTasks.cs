using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Deadlines;

public class GetAllDdlTasksQuery
{
    public required Guid UserId { get; init; }
    public DateTimeOffset? Now { get; init; }
}

public class GetAllDdlTasksQueryHandler(
    BlotzTaskDbContext db,
    RecurringTaskGeneratorService generatorService,
    ILogger<GetAllDdlTasksQueryHandler> logger)
{
    public async Task<List<DeadlineTaskDto>> Handle(GetAllDdlTasksQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching all DDL tasks for user {UserId}", query.UserId);

        var now = query.Now ?? DateTimeOffset.UtcNow;
        var today = DateOnly.FromDateTime(now.Date);

        var ddlTasks = await db.TaskItems
            .AsNoTracking()
            .Include(t => t.Deadline)
            .Include(t => t.Label)
            .Where(t => t.UserId == query.UserId 
                        && t.Deadline != null
                        && !t.IsDone
                        && (t.RecurringOccurrenceOverride == null
                            || t.RecurringOccurrenceOverride.OverrideType == RecurringOccurrenceOverrideType.Detached))
            .Select(task => new DeadlineTaskDto
            {
                Id = task.Id,
                OccurrenceKind = TaskOccurrenceKind.NormalTaskItem,
                RecurringOccurrence = null,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                DueAt = task.Deadline!.DueAt,
                IsPinned = task.Deadline.IsPinned,
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

        var recurringDeadlineTemplates = await db.RecurringTasks
            .AsNoTracking()
            .Include(r => r.Label)
            .Include(r => r.Series)
            .Where(r => r.UserId == query.UserId
                && r.IsActive
                && !r.Series.IsDeleted
                && r.IsDeadline
                && r.StartDate <= today)
            .ToListAsync(ct);

        var currentOccurrencesBySeries = recurringDeadlineTemplates
            .Select(recurring => new CurrentRecurringDeadlineOccurrence(
                recurring,
                generatorService.GetCurrentOccurrenceDate(recurring, today)))
            .Where(x => x.OccurrenceDate != null)
            .GroupBy(x => x.Recurring.SeriesId)
            .Select(group => group
                .OrderByDescending(x => x.OccurrenceDate)
                .ThenByDescending(x => x.Recurring.StartDate)
                .ThenByDescending(x => x.Recurring.Id)
                .First())
            .ToList();

        var currentSeriesIds = currentOccurrencesBySeries
            .Select(x => x.Recurring.SeriesId)
            .ToHashSet();

        var currentOccurrenceDates = currentOccurrencesBySeries
            .Select(x => x.OccurrenceDate!.Value)
            .ToHashSet();

        var recurringOverrideMap = await db.RecurringOccurrenceOverrides
            .AsNoTracking()
            .Include(o => o.TaskItem)
            .ThenInclude(t => t!.Deadline)
            .Include(o => o.TaskItem)
            .ThenInclude(t => t!.Label)
            .Where(o => o.Series.UserId == query.UserId
                && currentSeriesIds.Contains(o.SeriesId)
                && currentOccurrenceDates.Contains(o.OccurrenceDate))
            .ToDictionaryAsync(o => new RecurringSeriesOccurrenceKey(o.SeriesId, o.OccurrenceDate), ct);

        foreach (var currentOccurrence in currentOccurrencesBySeries)
        {
            var recurring = currentOccurrence.Recurring;
            var occurrenceDate = currentOccurrence.OccurrenceDate!.Value;

            var occurrenceKey = new RecurringSeriesOccurrenceKey(recurring.SeriesId, occurrenceDate);
            if (recurringOverrideMap.TryGetValue(occurrenceKey, out var recurringOverride))
            {
                var materializedDdlTask = DeadlineTaskDtoFactory.ToDeadlineTaskDto(recurringOverride);
                if (materializedDdlTask != null)
                {
                    ddlTasks.Add(materializedDdlTask);
                }

                continue;
            }

            ddlTasks.Add(new DeadlineTaskDto
            {
                Id = null,
                OccurrenceKind = TaskOccurrenceKind.VirtualRecurringOccurrence,
                RecurringOccurrence = new RecurringOccurrenceIdentityDto
                {
                    RecurringTaskId = recurring.Id,
                    OccurrenceDate = occurrenceDate
                },
                Title = recurring.Title,
                Description = recurring.Description,
                StartTime = generatorService.BuildOccurrenceStartTime(recurring, occurrenceDate),
                EndTime = generatorService.BuildOccurrenceEndTime(recurring, occurrenceDate),
                IsDone = false,
                DueAt = generatorService.BuildOccurrenceDueAt(recurring, occurrenceDate),
                IsPinned = false,
                Label = recurring.Label != null
                    ? new LabelDto
                    {
                        LabelId = recurring.Label.LabelId,
                        Name = recurring.Label.Name,
                        Color = recurring.Label.Color
                    }
                    : null
            });
        }

        ddlTasks = ddlTasks
            .OrderByDescending(t => t.IsPinned)
            .ThenBy(t => t.DueAt)
            .ThenBy(t => t.Title)
            .ToList();

        logger.LogInformation(
            "Successfully fetched {TaskCount} DDL tasks for user {UserId}",
            ddlTasks.Count,
            query.UserId);

        return ddlTasks;
    }

    // TODO(Blotz-Org/Blotz-Task-App-Private#1417): Keep the original non-recurring-only implementation for comparison while recurring deadlines are finalized.
    /*
    public async Task<List<DeadlineTaskDto>> Handle(GetAllDdlTasksQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching all DDL tasks for user {UserId}", query.UserId);

        var ddlTasks = await db.TaskItems
            .Include(t => t.Deadline)
            .Include(t => t.Label)
            .Where(t => t.UserId == query.UserId
                        && t.Deadline != null
                        && !t.IsDone)
            .OrderByDescending(t => t.Deadline!.IsPinned)
            .ThenBy(t => t.Deadline!.DueAt)
            .ThenBy(t => t.Title)
            .Select(task => new DeadlineTaskDto
            {
                Id = task.Id,
                Title = task.Title,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                DueAt = task.Deadline!.DueAt,
                IsPinned = task.Deadline.IsPinned,
                Label = task.Label != null
                    ? new LabelDto
                    {
                        LabelId = task.Label.LabelId,
                        Name = task.Label.Name,
                        Color = task.Label.Color
                    }
                    : null
            })
            .AsNoTracking()
            .ToListAsync(ct);

        logger.LogInformation(
            "Successfully fetched {TaskCount} DDL tasks for user {UserId}",
            ddlTasks.Count,
            query.UserId);

        return ddlTasks;
    }
    */
}

public class DeadlineTaskDto : TaskOccurrenceDtoBase
{
    public int? Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public LabelDto? Label { get; set; }
    public DateTimeOffset DueAt { get; set; }
    public bool IsPinned { get; set; }
}

internal sealed record CurrentRecurringDeadlineOccurrence(
    RecurringTask Recurring,
    DateOnly? OccurrenceDate);

internal sealed record RecurringSeriesOccurrenceKey(int SeriesId, DateOnly OccurrenceDate);

internal static class DeadlineTaskDtoFactory
{
    public static DeadlineTaskDto? ToDeadlineTaskDto(RecurringOccurrenceOverride recurringOverride)
    {
        if (recurringOverride.OverrideType is RecurringOccurrenceOverrideType.Skipped
            or RecurringOccurrenceOverrideType.Detached)
        {
            return null;
        }

        var task = recurringOverride.TaskItem;
        if (task == null || task.IsDone || task.Deadline == null)
        {
            return null;
        }

        return new DeadlineTaskDto
        {
            Id = task.Id,
            OccurrenceKind = TaskOccurrenceKind.MaterializedRecurringOccurrence,
            RecurringOccurrence = TaskOccurrenceDtoHelpers.ToRecurringOccurrenceIdentity(recurringOverride),
            Title = task.Title,
            Description = task.Description,
            StartTime = task.StartTime,
            EndTime = task.EndTime,
            IsDone = task.IsDone,
            DueAt = task.Deadline.DueAt,
            IsPinned = task.Deadline.IsPinned,
            Label = task.Label != null
                ? new LabelDto
                {
                    LabelId = task.Label.LabelId,
                    Name = task.Label.Name,
                    Color = task.Label.Color
                }
                : null
        };
    }
}

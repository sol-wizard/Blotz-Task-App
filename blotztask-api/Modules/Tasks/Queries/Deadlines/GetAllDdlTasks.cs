using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
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

        var materializedRecurringOccurrenceKeys = (await db.TaskItems
                .AsNoTracking()
                .Where(t => t.UserId == query.UserId
                    && t.RecurringTaskId != null
                    && t.RecurringOccurrenceDate != null)
                .Select(t => new
                {
                    RecurringTaskId = t.RecurringTaskId!.Value,
                    OccurrenceDate = t.RecurringOccurrenceDate!.Value
                })
                .ToListAsync(ct))
            .Select(t => (t.RecurringTaskId, t.OccurrenceDate))
            .ToHashSet();

        var ddlTasks = await db.TaskItems
            .AsNoTracking()
            .Include(t => t.Deadline)
            .Include(t => t.Label)
            .Where(t => t.UserId == query.UserId 
                        && t.Deadline != null
                        && !t.IsDone)
            .Select(task => new DeadlineTaskDto
            {
                Id = task.Id,
                OccurrenceKind = task.RecurringTaskId == null
                    ? TaskOccurrenceKind.NormalTaskItem
                    : TaskOccurrenceKind.MaterializedRecurringOccurrence,
                RecurringOccurrence = task.RecurringTaskId != null && task.RecurringOccurrenceDate != null
                    ? new RecurringOccurrenceIdentityDto
                    {
                        RecurringTaskId = task.RecurringTaskId.Value,
                        OccurrenceDate = task.RecurringOccurrenceDate.Value
                    }
                    : null,
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
            .Where(r => r.UserId == query.UserId
                && r.IsActive
                && r.IsDeadline
                && r.StartDate <= today)
            .ToListAsync(ct);

        foreach (var recurring in recurringDeadlineTemplates)
        {
            var occurrenceDate = generatorService.GetCurrentOccurrenceDate(recurring, today);
            if (occurrenceDate == null) continue;

            var occurrenceKey = (recurring.Id, occurrenceDate.Value);
            if (materializedRecurringOccurrenceKeys.Contains(occurrenceKey)) continue;

            ddlTasks.Add(new DeadlineTaskDto
            {
                Id = null,
                OccurrenceKind = TaskOccurrenceKind.VirtualRecurringOccurrence,
                RecurringOccurrence = new RecurringOccurrenceIdentityDto
                {
                    RecurringTaskId = recurring.Id,
                    OccurrenceDate = occurrenceDate.Value
                },
                Title = recurring.Title,
                Description = recurring.Description,
                StartTime = generatorService.BuildOccurrenceStartTime(recurring, occurrenceDate.Value),
                EndTime = generatorService.BuildOccurrenceEndTime(recurring, occurrenceDate.Value),
                IsDone = false,
                DueAt = generatorService.BuildOccurrenceDueAt(recurring, occurrenceDate.Value),
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

using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetAllDdlTasksQuery
{
    public required Guid UserId { get; init; }
}

public class GetAllDdlTasksQueryHandler(
    BlotzTaskDbContext db,
    ILogger<GetAllDdlTasksQueryHandler> logger)
{
    public async Task<List<AllDdlTaskItemDto>> Handle(GetAllDdlTasksQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching all DDL tasks for user {UserId}", query.UserId);
        
        var now = DateTimeOffset.UtcNow;

        var ddlTasks = await db.TaskItems
            .Include(t => t.Deadline)
            .Include(t => t.Label)
            .Where(t => t.UserId == query.UserId 
                        && t.Deadline != null
                        && t.Deadline.DueAt >= now)
            .OrderBy(t => t.Deadline!.DueAt)
            .ThenBy(t => t.Title)
            .Select(task => new AllDdlTaskItemDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                NotificationId = task.NotificationId,
                AlertTime = task.AlertTime,
                IsDdl = true,
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

        logger.LogInformation(
            "Successfully fetched {TaskCount} DDL tasks for user {UserId}",
            ddlTasks.Count,
            query.UserId);

        return ddlTasks;
    }
}

public class AllDdlTaskItemDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public LabelDto? Label { get; set; }
    public string? NotificationId { get; set; }
    public DateTimeOffset? AlertTime { get; set; }

    public bool IsDdl { get; set; }
    public DateTimeOffset DueAt { get; set; }
    public bool IsPinned { get; set; }
}
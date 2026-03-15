using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Deadlines;

public class GetAllDdlTasksQuery
{
    public required Guid UserId { get; init; }
}

public class GetAllDdlTasksQueryHandler(
    BlotzTaskDbContext db,
    ILogger<GetAllDdlTasksQueryHandler> logger)
{
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
}

public class DeadlineTaskDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public LabelDto? Label { get; set; }
    public DateTimeOffset DueAt { get; set; }
    public bool IsPinned { get; set; }
}
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetAllDdlTasksQuery
{
    public required Guid UserId { get; init; }
}

public class GetAllDdlTasksQueryHandler(BlotzTaskDbContext db, ILogger<GetAllDdlTasksQueryHandler> logger)
{
    public async Task<List<AllTaskItemDto>> Handle(GetAllDdlTasksQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching all DDL tasks for user {UserId}", query.UserId);

        var tasks = await db.TaskItems
            .Where(t => t.UserId == query.UserId && t.IsDdl)
            .OrderByDescending(t => t.StartTime).ThenBy(t => t.Title)
            .Select(task => new AllTaskItemDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                NotificationId = task.NotificationId,
                IsDdl = task.IsDdl,
                AlertTime = task.AlertTime,
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

        logger.LogInformation("Successfully fetched {TaskCount} DDL tasks for user {UserId}", tasks.Count, query.UserId);
        return tasks;
    }
}
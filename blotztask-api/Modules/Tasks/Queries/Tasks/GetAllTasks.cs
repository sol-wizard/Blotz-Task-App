using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetAllTasksQuery
{
    public required Guid UserId { get; init; }
}

public class GetAllTasksQueryHandler(BlotzTaskDbContext db, ILogger<GetAllTasksQueryHandler> logger)
{
    public async Task<List<AllTaskItemDto>> Handle(GetAllTasksQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching all tasks for user {UserId}", query.UserId);

        var tasks = await db.TaskItems
            .Where(t => t.UserId == query.UserId)
            .OrderByDescending(t => t.StartTime).ThenBy(t => t.Title)
            .Select(task => new AllTaskItemDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
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

public class AllTaskItemDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public LabelDto? Label { get; set; }
}
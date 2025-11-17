using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetFloatingTasksQuery
{
    [Required] public required Guid UserId { get; init; }
}

public class GetFloatingTasksQueryHandler(BlotzTaskDbContext db, ILogger<GetFloatingTasksQueryHandler> logger)
{
    public async Task<List<FloatingTaskItemDto>> Handle(GetFloatingTasksQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching floating tasks (no start/end time) for user {UserId}", query.UserId);

        var tasks = await db.TaskItems
            .Where(t => t.UserId == query.UserId
                        && t.StartTime == null
                        && t.EndTime == null
                        && t.IsDone == false
            )
            .Select(task => new FloatingTaskItemDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                CreatedAt = task.CreatedAt,
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

        logger.LogInformation("Successfully fetched {TaskCount} floating tasks for user {UserId}", tasks.Count,
            query.UserId);
        return tasks;
    }
}

public class FloatingTaskItemDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; set; }
    public LabelDto? Label { get; set; }
}
using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetStarSparkFloatingTasksQuery
{
    [Required] public required Guid UserId { get; init; }
}

public class GetStarSparkFloatingTasksQueryHandler(BlotzTaskDbContext db, ILogger<GetStarSparkFloatingTasksQueryHandler> logger)
{
    public async Task<List<FloatingTaskItemDto>> Handle(GetStarSparkFloatingTasksQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching floating tasks of user {UserId} for StarSpark", query.UserId);

        var tasks = await db.TaskItems
            .Where(t => t.UserId == query.UserId
                        && t.StartTime == null
                        && t.EndTime == null
                        && t.CreatedAt < DateTime.UtcNow.Date
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

        logger.LogInformation("Successfully fetched {TaskCount} floating tasks of user {UserId} for StarSpark", tasks.Count,
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
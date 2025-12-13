using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetFloatingTasksByQuery
{
    [Required]
    public required Guid UserId { get; init; }
    [Required]
    public required string Query { get; init; }
}

public class GetFloatingTasksByQueryHandler(BlotzTaskDbContext db, ILogger<GetFloatingTasksQueryHandler> logger)
{
    public async Task<List<FloatingTaskItemByQueryDto>> Handle(GetFloatingTasksByQuery request, CancellationToken ct = default)
    {
        
        var rawQuery = request.Query?.Trim() ?? string.Empty;
        
        var keyword = rawQuery.ToLower();
        logger.LogInformation("Searching floating tasks for user {UserId} with query {Query}", request.UserId, rawQuery);
        
        var tasks = await db.TaskItems
            .Where(t => t.UserId == request.UserId
                        && t.StartTime == null
                        && t.EndTime == null
                        && t.IsDone == false
                        && t.CreatedAt < DateTime.UtcNow.Date
                        && (t.Title.ToLower().Contains(keyword) || t.Description.ToLower().Contains(keyword))
            ).Select(task => new FloatingTaskItemByQueryDto
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

        return tasks;
    }
}

public class FloatingTaskItemByQueryDto
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

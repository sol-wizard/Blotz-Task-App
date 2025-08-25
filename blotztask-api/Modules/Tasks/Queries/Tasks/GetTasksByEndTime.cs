using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetTasksByDateQuery
{
    [Required]
    public required string UserId { get; init; }
    [Required]
    public DateTime StartDateUtc { get; init; }
}

public class GetTasksByDateQueryHandler(BlotzTaskDbContext db, ILogger<GetTasksByDateQueryHandler> logger)
{
    public async Task<List<TaskByDateItemDto>> Handle(GetTasksByDateQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching tasks by end time for user {UserId} up to {StartDateUtc}", 
            query.UserId, query.StartDateUtc);
        
        DateTime endDateUtc = query.StartDateUtc.AddDays(1);

        var tasks = await db.TaskItems
            .Where(task => task.UserId == query.UserId)
            .Where(task => task.EndTime >= query.StartDateUtc && task.EndTime < endDateUtc)
            .Select(task => new TaskByDateItemDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                Label = new LabelDto
                {
                    LabelId = task.Label.LabelId,
                    Name = task.Label.Name,
                    Color = task.Label.Color
                },
                HasTime = task.HasTime
            })
            .ToListAsync(ct);
        
        logger.LogInformation("Successfully fetched {TaskCount} tasks for user {UserId}", tasks.Count, query.UserId);
        return tasks;
    }
}

public class TaskByDateItemDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public required LabelDto Label { get; set; }
    public bool HasTime { get; set; }
}
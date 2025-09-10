using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetTasksByDateQuery
{
    [Required]
    public required Guid UserId { get; init; }
    [Required]
    public DateTime StartDateUtc { get; init; }
    [Required]
    public bool IncludeFloatingForToday { get; init; } = false;
}

public class GetTasksByDateQueryHandler(BlotzTaskDbContext db, ILogger<GetTasksByDateQueryHandler> logger)
{
    public async Task<List<TaskByDateItemDto>> Handle(GetTasksByDateQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching tasks by end time for user {UserId} up to {StartDateUtc}. Whether including floating tasks for today is {IncludeFloatingForToday}",
            query.UserId, query.StartDateUtc, query.IncludeFloatingForToday);

        DateTime endDateUtc = query.StartDateUtc.AddDays(1);

        var tasks = await db.TaskItems
            .Where(t => t.UserId == query.UserId &&
            (
                // Tasks in date range
                (t.EndTime != null && t.EndTime >= query.StartDateUtc && t.EndTime < endDateUtc)
                ||
                // Floating tasks
                (query.IncludeFloatingForToday && t.StartTime == null && t.EndTime == null && !t.IsDone)
            ))
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
                HasTime = task.HasTime ?? false
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
using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Tasks.Enums;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetOverdueTasksQuery
{
    [Required] public required Guid UserId { get; init; }
}

public class GetOverdueTasksQueryHandler(
    BlotzTaskDbContext db,
    ILogger<GetOverdueTasksQueryHandler> logger)
{
    public async Task<List<OverdueTaskItemDto>> Handle(GetOverdueTasksQuery query,
        CancellationToken ct = default)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var todayStartUtc = new DateTimeOffset(nowUtc.UtcDateTime.Date, TimeSpan.Zero);
        var sevenDaysAgoStartUtc = todayStartUtc.AddDays(-6);

        logger.LogInformation(
            "Fetching overdue tasks (last 7 days incl. today) for user {UserId}. Window: [{From} .. {To})",
            query.UserId, sevenDaysAgoStartUtc, todayStartUtc);

        var tasks = await db.TaskItems
            .Where(t => t.UserId == query.UserId
                        && !t.IsDone
                        && t.StartTime != null
                        && t.EndTime != null
                        && t.EndTime >= sevenDaysAgoStartUtc
                        && t.EndTime < todayStartUtc)
            .Select(task => new OverdueTaskItemDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                TimeType = task.TimeType,
                Label = task.Label != null ? new LabelDto
                {
                    LabelId = task.Label.LabelId,
                    Name = task.Label.Name,
                    Color = task.Label.Color
                } : null
            })
            .ToListAsync(ct);

        logger.LogInformation("Fetched {Count} overdue tasks for user {UserId}.", tasks.Count, query.UserId);
        return tasks;
    }
}

public class OverdueTaskItemDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public LabelDto? Label { get; set; }
    public TaskTimeType? TimeType { get; set; }
}
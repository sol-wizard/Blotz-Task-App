using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetTasksByIdQuery
{
    [Required] public required int TaskId { get; init; }
    [Required] public required Guid UserId { get; init; }
}

public class GetTaskByIdQueryHandler(BlotzTaskDbContext db, ILogger<GetTaskByIdQueryHandler> logger)
{
    public async Task<TaskByIdItemDto> Handle(GetTasksByIdQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching task with ID {TaskId}.", query.TaskId);

        var result = await db.TaskItems.Where(t => t.Id == query.TaskId && t.UserId == query.UserId)
            .Select(task => new TaskByIdItemDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                NotificationId = task.NotificationId,
                AlertTime = task.AlertTime,
                Label = task.Label == null
                    ? null
                    : new LabelDto
                    {
                        LabelId = task.Label.LabelId,
                        Name = task.Label.Name,
                        Color = task.Label.Color
                    },
                TimeType = task.TimeType
            })
            .FirstOrDefaultAsync(ct);

        if (result != null)
        {
            logger.LogInformation("Successfully fetched task with ID {TaskId} and Title {TaskTitle}", result.Id,
                result.Title);
            return result;
        }

        logger.LogWarning("No task found with ID {TaskId}", query.TaskId);
        throw new NotFoundException($"No task found with ID {query.TaskId}");
    }
}

public class TaskByIdItemDto
{
    public required int Id { get; set; }
    public required string Title { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public LabelDto? Label { get; set; }
    public TaskTimeType? TimeType { get; set; }
    public string? NotificationId { get; set; }
    public DateTimeOffset? AlertTime { get; set; }
}

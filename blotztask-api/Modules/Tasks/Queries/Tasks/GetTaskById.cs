using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetTaskByIdQueryHandler(BlotzTaskDbContext db, ILogger<GetTaskByIdQueryHandler> logger)
{
    public async Task<TaskByIdItemDto> Handle(int TaskId, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching task with ID {TaskId}.", TaskId);

        var task = await db.TaskItems.FindAsync(TaskId, ct);

        if (task == null)
        {
            throw new NotFoundException($"Task with ID {TaskId} not found.");
        }

        var result = new TaskByIdItemDto
        {
            Id = task.Id,
            Title = task.Title,
            Description = task.Description,
            EndTime = task.EndTime,
            IsDone = task.IsDone,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt,
            LabelId = task.LabelId,
            HasTime = task.HasTime
        };

        logger.LogInformation("Successfully fetched task with ID {TaskId} and Title {TaskTitle}", result.Id, result.Title);
        return result;
    }
}

public class TaskByIdItemDto
{
    public required int Id { get; set; }
    public required string Title { get; set; }
    public required string Description { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public required int LabelId { get; set; }
    public bool HasTime { get; set; }

}
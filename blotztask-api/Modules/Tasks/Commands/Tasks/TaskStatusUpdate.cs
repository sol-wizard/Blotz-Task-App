using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class TaskStatusUpdateQuery
{
    [Required]
    public int TaskId { get; set; }
    public bool? IsDone { get; set; }
}

public class TaskStatusUpdateQueryHandler(BlotzTaskDbContext db, ILogger<TaskStatusUpdateQueryHandler> logger)
{
    public async Task<TaskStatusResultDto> Handle(TaskStatusUpdateQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Finding task {Id}", query.TaskId);

        var task = await db.TaskItems.FindAsync(query.TaskId, ct);

        if (task == null)
        {
            throw new NotFoundException($"Task with ID {query.TaskId} was not found.");
        }

        // If task.IsDone is null, set it to be false, otherwise, toggle the task.IsDone
        task.IsDone = query.IsDone ?? !task.IsDone;

        logger.LogInformation("The completion status of task {Id} was changed to {IsDone}", task.Id, task.IsDone);

        task.UpdatedAt = DateTime.UtcNow;
        db.TaskItems.Update(task);
        await db.SaveChangesAsync(ct);

        return new TaskStatusResultDto
        {
            Id = task.Id,
            UpdatedAt = task.UpdatedAt,
            Message = task.IsDone ? "Task marked as completed." : "Task marked as incomplete."
        };
    }
}

public class TaskStatusResultDto
{
    public int Id { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string Message { get; set; } = string.Empty;
}

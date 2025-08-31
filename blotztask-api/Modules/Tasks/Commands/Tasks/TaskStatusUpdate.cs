using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class TaskStatusUpdateCommand
{
    [Required]
    public int TaskId { get; set; }
    public bool? IsDone { get; set; }
}

public class TaskStatusUpdateCommandHandler(BlotzTaskDbContext db, ILogger<TaskStatusUpdateCommandHandler> logger)
{
    public async Task<TaskStatusResultDto> Handle(TaskStatusUpdateCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Finding task {Id}", command.TaskId);

        var task = await db.TaskItems.FindAsync(command.TaskId, ct);

        if (task == null)
        {
            throw new NotFoundException($"Task with ID {command.TaskId} was not found.");
        }

        // If task.IsDone is null, set it to be false, otherwise, toggle the task.IsDone
        task.IsDone = command.IsDone ?? !task.IsDone;

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

using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class EditTaskCommand
{
    [Required]
    public int TaskId { get; init; }
    [Required]
    public required EditTaskItemDto TaskDetails { get; init; }
}

public class EditTaskCommandHandler(BlotzTaskDbContext db, ILogger<EditTaskCommandHandler> logger)
{
    public async Task<string> Handle(EditTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Editing task {TaskId}", command.TaskId);

        var task = await db.TaskItems.FindAsync(command.TaskId, ct);

        if (task == null)
        {
            throw new NotFoundException($"Task with ID {command.TaskId} not found.");
        }

        task.Title = command.TaskDetails.Title;
        task.Description = command.TaskDetails.Description;
        task.EndTime = command.TaskDetails.EndTime;
        task.UpdatedAt = DateTime.UtcNow;
        task.LabelId = command.TaskDetails.LabelId;
        task.HasTime = command.TaskDetails.HasTime;
        task.IsDone = command.TaskDetails.IsDone;

        db.TaskItems.Update(task);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Task {TaskId} was successfully edited", command.TaskId);

        return "Task edited successfully.";
    }
}
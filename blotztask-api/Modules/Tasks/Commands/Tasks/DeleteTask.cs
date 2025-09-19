using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Shared.Exceptions;
using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class DeleteTaskCommand
{
    [Required]
    public int TaskId { get; init; }
}

public class DeleteTaskCommandHandler(BlotzTaskDbContext db, ILogger<DeleteTaskCommandHandler> logger)
{
    public async Task<string> Handle(DeleteTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Deleting task {TaskId}", command.TaskId);

        var taskItem = await db.TaskItems.FindAsync(command.TaskId, ct);

        if (taskItem == null)
        {
            throw new NotFoundException($"Task with ID {command.TaskId} not found.");
        }

        var deletedTask = new DeletedTaskItem
        {
            Id = taskItem.Id,
            Title = taskItem.Title,
            Description = taskItem.Description,
            EndTime = taskItem.EndTime,
            IsDone = taskItem.IsDone,
            CreatedAt = taskItem.CreatedAt,
            UpdatedAt = taskItem.UpdatedAt,
            DeletedAt = DateTime.UtcNow,
            UserId = taskItem.UserId,
            LabelId = taskItem.LabelId,
        };

        db.DeletedTaskItems.Add(deletedTask);
        db.TaskItems.Remove(taskItem);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Task {TaskId} was successfully deleted", command.TaskId);

        return "Task deleted successfully.";
    }
}
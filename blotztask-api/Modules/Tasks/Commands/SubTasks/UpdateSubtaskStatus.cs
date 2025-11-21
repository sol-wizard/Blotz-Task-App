using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.SubTasks;



public class UpdateSubtaskStatusCommand
{
    [Required]
    public int subtaskId { get; set; }
}

public class UpdateSubtaskStatusCommandHandler(BlotzTaskDbContext db, ILogger<UpdateSubtaskStatusCommandHandler> logger)
{
    public async Task<SubtaskStatusResultDto> Handle(UpdateSubtaskStatusCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Updating subtask status");
        var subtask = await db.Subtasks.FindAsync(command.subtaskId, ct);

        if (subtask == null)
        {
            throw new NotFoundException($"Subtask with id {command.subtaskId} was not found.");
        }

        subtask.IsDone = !subtask.IsDone;
        logger.LogInformation("The completion status of subtask {Id} was changed to {IsDone}", subtask.Id, subtask.IsDone);
        subtask.UpdatedAt = DateTime.UtcNow;
        db.Subtasks.Update(subtask);
        await db.SaveChangesAsync(ct);

        return new SubtaskStatusResultDto
        {
            Id = subtask.Id,
            UpdatedAt = subtask.UpdatedAt,
            Message = subtask.IsDone? "Subtask marked as completed" :  "Subtask marked as incompleted"
        };

    }
}

public class SubtaskStatusResultDto
{
    public int Id { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string Message { get; set; } = string.Empty;
}
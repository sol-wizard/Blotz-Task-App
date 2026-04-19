using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.SubTasks;

public class UpdateSubtaskStatusCommand
{
    public int SubtaskId { get; set; }
}

public class UpdateSubtaskStatusCommandHandler(BlotzTaskDbContext db, ILogger<UpdateSubtaskStatusCommandHandler> logger)
{
    public async Task<string> Handle(UpdateSubtaskStatusCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Updating subtask status");
        var subtask = await db.Subtasks.FindAsync(command.SubtaskId, ct);

        if (subtask == null)
        {
            throw new NotFoundException($"Subtask with id {command.SubtaskId} was not found.");
        }

        subtask.IsDone = !subtask.IsDone;
        logger.LogInformation("The completion status of subtask {Id} was changed to {IsDone}", subtask.Id, subtask.IsDone);
        subtask.UpdatedAt = DateTime.UtcNow;
        db.Subtasks.Update(subtask);
        await db.SaveChangesAsync(ct);

        return "Subtask status updated successfully.";

    }
}


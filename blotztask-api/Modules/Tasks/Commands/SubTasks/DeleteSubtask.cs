using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.SubTasks;

public class DeleteSubtaskCommand
{
    [Required]
    public int SubtaskId { get; set; }

    [Required] public required Guid UserId { get; init; }
}

public class DeleteSubtaskCommandHandler(BlotzTaskDbContext db, ILogger<DeleteSubtaskCommandHandler> logger)
{
    public async Task<string?> Handle(DeleteSubtaskCommand command, CancellationToken ct = default)
    {
        var subtaskToDelete = await db.Subtasks
            .FirstOrDefaultAsync(s => s.Id == command.SubtaskId && s.ParentTask.UserId == command.UserId, ct);
        if (subtaskToDelete == null)
        {
            throw new NotFoundException($"Subtask with ID {command.SubtaskId} not found");
        }
        db.Subtasks.Remove(subtaskToDelete);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Subtask {SubtaskId} was deleted", command.SubtaskId);
        return "Subtask deleted";
    }

}
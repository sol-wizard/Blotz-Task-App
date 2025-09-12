using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;

namespace BlotzTask.Modules.Tasks.Commands.SubTasks;

public class DeleteSubtaskCommand
{
    [Required]
    public int SubtaskId { get; set; }
    
    [Required]
    public int TaskId { get; set; }
}

public class DeleteSubtaskCommandHandler(BlotzTaskDbContext db, ILogger<DeleteSubtaskCommandHandler> logger)
{
    public async Task<string> Handle(DeleteSubtaskCommand command, CancellationToken ct = default)
    {
        logger?.LogInformation($"Deleting subtask {command.SubtaskId}");
        var subtask = await db.Subtasks.FindAsync(command.SubtaskId, ct);
        if (subtask == null || subtask.ParentTaskId != command.TaskId)
            throw new Exception($"Subtask {command.SubtaskId} not found for task {command.TaskId}.");
        db.Subtasks.Remove(subtask);
        await db.SaveChangesAsync(ct);
        logger?.LogInformation($"Subtask {command.SubtaskId} deleted.");
        return $"Subtask {command.SubtaskId} deleted.";
    }
    
}


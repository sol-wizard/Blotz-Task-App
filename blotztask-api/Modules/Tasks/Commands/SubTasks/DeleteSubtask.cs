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

public class DeleteSubtaskCommandHandler
{
    private readonly BlotzTaskDbContext _db;

    public DeleteSubtaskCommandHandler(BlotzTaskDbContext db)
    {
        _db = db;
    }

    public async Task<string> Handle(DeleteSubtaskCommand command, CancellationToken ct = default,
        ILogger<DeleteSubtaskCommandHandler> logger = null!)
    {
        logger?.LogInformation($"Deleting subtask {command.SubtaskId}");
        var subtask = await _db.Subtasks.FindAsync(command.SubtaskId, ct);
        if (subtask == null || subtask.ParentTaskId != command.TaskId)
            throw new Exception($"Subtask {command.SubtaskId} not found for task {command.TaskId}.");
        _db.Subtasks.Remove(subtask);
        await _db.SaveChangesAsync(ct);
        logger?.LogInformation($"Subtask {command.SubtaskId} deleted.");
        return $"Subtask {command.SubtaskId} deleted.";
    }
    
}


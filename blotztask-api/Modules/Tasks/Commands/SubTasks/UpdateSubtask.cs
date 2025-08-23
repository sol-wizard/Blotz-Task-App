using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.SubTasks;

public class UpdateSubtaskCommand
{
    public int TaskId { get; set; }
    public int SubtaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TimeSpan? Duration { get; set; }
    public bool IsDone { get; set; }
}

public class UpdateSubtaskHandler(BlotzTaskDbContext db)
{
    public async Task<string> Handle(UpdateSubtaskCommand command, CancellationToken ct = default)
    {
        var subtask = await db.Subtasks
            .FirstOrDefaultAsync(s => s.Id == command.SubtaskId && s.ParentTaskId == command.TaskId, ct);

        if (subtask == null)
        {
            throw new NotFoundException(
                $"Subtask {command.SubtaskId} under Task {command.TaskId} was not found.");
        }

        subtask.Title = command.Title;
        subtask.Description = command.Description;
        subtask.Duration = command.Duration;
        subtask.IsDone = command.IsDone;
        subtask.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return "Subtask updated successfully";
    }
}
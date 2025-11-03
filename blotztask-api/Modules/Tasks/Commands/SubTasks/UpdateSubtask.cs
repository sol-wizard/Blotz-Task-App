using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.SubTasks;

public class UpdateSubtaskCommand
{
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Title must be at most 200 characters.")]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TimeSpan? Duration { get; set; }
    public bool IsDone { get; set; }
    public int Order { get; set; }
}

public class UpdateSubtaskCommandHandler(BlotzTaskDbContext db, ILogger<UpdateSubtaskCommandHandler> logger)
{
    public async Task<string> Handle(UpdateSubtaskCommand command, int parentTaskId, int subtaskId, CancellationToken ct = default)
    {
        logger.LogInformation("Updating subtask {SubtaskId} for task {TaskId}", subtaskId, parentTaskId);

        var subtask = await db.Subtasks
            .FirstOrDefaultAsync(s => s.Id == subtaskId && s.ParentTaskId == parentTaskId, ct);

        if (subtask == null)
        {
            logger.LogError("Subtask {SubtaskId} not found for task {TaskId}", subtaskId, parentTaskId);
            throw new NotFoundException($"Subtask {subtaskId} under Task {parentTaskId} was not found.");
        }

        subtask.Title = command.Title;
        subtask.Description = command.Description;
        subtask.Duration = command.Duration;
        subtask.IsDone = command.IsDone;
        subtask.Order = command.Order;
        subtask.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        logger.LogInformation("Successfully updated subtask {SubtaskId} for task {TaskId}", subtaskId, parentTaskId);
        return "Subtask updated successfully";
    }
}
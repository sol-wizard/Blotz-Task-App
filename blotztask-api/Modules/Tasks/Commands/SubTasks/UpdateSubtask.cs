using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.SubTasks;

public class UpdateSubtaskCommand
{
    [Required]
    public int TaskId { get; set; }
    [Required]
    public int SubtaskId { get; set; }
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Title must be at most 200 characters.")]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TimeSpan? Duration { get; set; }
    public bool IsDone { get; set; }
}

public class UpdateSubtaskHandler(BlotzTaskDbContext db, ILogger<UpdateSubtaskHandler> logger)
{
    public async Task<string> Handle(UpdateSubtaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Updating subtask {SubtaskId} for task {TaskId}", command.SubtaskId, command.TaskId);

        var subtask = await db.Subtasks
            .FirstOrDefaultAsync(s => s.Id == command.SubtaskId && s.ParentTaskId == command.TaskId, ct);

        if (subtask == null)
        {
            logger.LogError("Subtask {SubtaskId} not found for task {TaskId}", command.SubtaskId, command.TaskId);
            throw new NotFoundException($"Subtask {command.SubtaskId} under Task {command.TaskId} was not found.");
        }

        subtask.Title = command.Title;
        subtask.Description = command.Description;
        subtask.Duration = command.Duration;
        subtask.IsDone = command.IsDone;
        subtask.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        logger.LogInformation("Successfully updated subtask {SubtaskId} for task {TaskId}", command.SubtaskId, command.TaskId);
        return "Subtask updated successfully";
    }
}
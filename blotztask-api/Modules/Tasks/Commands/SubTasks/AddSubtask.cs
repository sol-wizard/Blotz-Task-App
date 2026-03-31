using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.SubTasks;

public class AddSubtaskCommand
{
    [Required(ErrorMessage = "Parent task ID is required")]
    public int ParentTaskId { get; set; }
    [Required(ErrorMessage = "Title is required")]
    public string Title { get; set; }
    public TimeSpan? Duration { get; set; }
    
    [Required(ErrorMessage = "Order is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Order must be greater than 0.")]
    public int Order { get; set; }
}

public class AddSubtaskCommandHandler(
    BlotzTaskDbContext db, 
    ILogger<AddSubtaskCommandHandler> logger
    )
{
    public async Task<int> Handle(AddSubtaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Adding subtask for task {TaskId}", command.ParentTaskId);

        var parentTaskExists = await db.TaskItems.AnyAsync(t => t.Id == command.ParentTaskId, ct);
        if (!parentTaskExists)
        {
            logger.LogError("Parent task {TaskId} doesn't exist",  command.ParentTaskId);
            throw new NotFoundException($"Task {command.ParentTaskId} not found");
        }
        var subtask = new Subtask
        {
            ParentTaskId = command.ParentTaskId,
            Title = command.Title,
            Duration = command.Duration,
            Order = command.Order,
            IsDone = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        db.Subtasks.Add(subtask);
        await db.SaveChangesAsync(ct);
        
        logger.LogInformation("Subtask {SubtaskId} added", subtask.Id);
        return subtask.Id;

    }
}
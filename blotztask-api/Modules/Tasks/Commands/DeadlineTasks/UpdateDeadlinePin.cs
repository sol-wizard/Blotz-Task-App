using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.DeadlineTasks;

public class UpdateDeadlinePinCommand
{
    [Required]
    public int TaskId { get; set; }
    [Required]
    public bool IsPinned { get; set; }
    
    public Guid UserId { get; set; }
}

public class UpdateDeadlinePinCommandHandler(BlotzTaskDbContext db, ILogger<UpdateDeadlinePinCommandHandler> logger)
{
    private const int MaxPinnedDeadlines = 3;

    public async Task<bool> Handle(UpdateDeadlinePinCommand command, CancellationToken ct)
    {
        var deadline = await db.TaskDeadlines
            .FirstOrDefaultAsync(x => x.TaskItemId == command.TaskId, ct);

        if (deadline == null)
        {
            throw new NotFoundException($"Deadline Task with ID {command.TaskId} was not found.");
        }

        if (command.IsPinned)
        {
            var currentPinnedCount = await db.TaskDeadlines
                .CountAsync(x => x.IsPinned && x.TaskItem.UserId == command.UserId && !x.TaskItem.IsDone, ct);

            if (currentPinnedCount >= MaxPinnedDeadlines)
            {
                throw new ValidationException("You can pin a maximum of 3 deadline tasks.");
            }
        }
        
        deadline.IsPinned = command.IsPinned;
        deadline.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Deadline Task {TaskId} Pin was successfully {IsPin}", command.TaskId, command.IsPinned);
        
        return true;
    }
}
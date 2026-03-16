using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.DeadlineTasks;

public class UpdateDeadlinePinCommand
{
    [Required]
    public int TaskId { get; set; }
    [Required]
    public bool IsPinned { get; set; }
}

public class UpdateDeadlinePinCommandHandler(BlotzTaskDbContext dbcontext, ILogger<UpdateDeadlinePinCommandHandler> logger)
{
    public async Task<bool> Handle(UpdateDeadlinePinCommand command, CancellationToken ct)
    {
        var deadline = await dbcontext.Set<TaskDeadline>()
            .FirstOrDefaultAsync(x => x.TaskItemId == command.TaskId, ct);

        if (deadline == null)
        {
            throw new NotFoundException($"Deadline Task with ID {command.TaskId} was not found.");
        }
        
        deadline.IsPinned = command.IsPinned;
        deadline.UpdatedAt = DateTime.UtcNow;
        dbcontext.TaskDeadlines.Update(deadline);
        await dbcontext.SaveChangesAsync(ct);
        logger.LogInformation("Deadline Task {TaskId} Pin was successfully {IsPin}", command.TaskId, command.IsPinned);
        
        return true;
    }
}

public class UpdateDeadlinePinDto
{
    [Required]
    public bool IsPinned { get; set; }
}
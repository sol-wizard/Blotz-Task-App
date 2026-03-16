using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class UpdateDeadlinePinCommand
{
    [Required]
    public int TaskId { get; set; }
    [Required]
    public bool IsPinned { get; set; }
}

public class UpdateDeadlinePinCommandHandler(BlotzTaskDbContext dbcontext, ILogger<UpdateDeadlinePinCommandHandler> logger)
{
    public async Task<UpdateDeadlinePinDto> Handle(UpdateDeadlinePinCommand command, CancellationToken ct)
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

        return new UpdateDeadlinePinDto
        {
            IsPinned = command.IsPinned
        };
    }
}

public class UpdateDeadlinePinDto
{
    [Required]
    public bool IsPinned { get; set; }
}
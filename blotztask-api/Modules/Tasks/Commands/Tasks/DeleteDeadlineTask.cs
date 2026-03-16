using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class DeleteDeadlineTaskCommand
{
    [Required]
    public int TaskId { get; set; }
}

public class DeleteDeadlineTaskCommandHandler (BlotzTaskDbContext db, ILogger<DeleteDeadlineTaskCommandHandler> logger)
{
    public async Task<string> Handle(DeleteDeadlineTaskCommand command, CancellationToken ct)
    {
        logger.LogInformation("Deleting task {TaskId}'s Deadline Task", command.TaskId);
        
        var deadline = await db.Set<TaskDeadline>()
            .Include(x => x.TaskItem)
            .FirstOrDefaultAsync(x => x.TaskItemId == command.TaskId, ct);

        if (deadline is null)
        {
            throw new NotFoundException($"Deadline Task with Task ID {command.TaskId} not found.");
        }

        db.Set<TaskDeadline>().Remove(deadline);
        await db.SaveChangesAsync(ct);
        
        logger.LogInformation("Deadline Task with Task ID {TaskId} was successfully deleted", command.TaskId);

        return "Deadline Task deleted successfully";
    }
}
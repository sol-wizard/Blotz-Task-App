using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Shared.Exceptions;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class DeleteTaskCommand
{
    [Required]
    public int TaskId { get; init; }

    [Required]
    public required Guid UserId { get; init; }
}

public class DeleteTaskCommandHandler(BlotzTaskDbContext db, ILogger<DeleteTaskCommandHandler> logger)
{
    public async Task<string> Handle(DeleteTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Deleting task {TaskId}", command.TaskId);

        var taskItem = await db.TaskItems
            .Include(t => t.RecurringOccurrenceOverride)
            .FirstOrDefaultAsync(t => t.Id == command.TaskId && t.UserId == command.UserId, ct);

        if (taskItem == null)
        {
            throw new NotFoundException($"Task with ID {command.TaskId} not found.");
        }

        var deletedTask = new DeletedTaskItem
        {
            Id = taskItem.Id,
            Title = taskItem.Title,
            Description = taskItem.Description,
            StartTime = taskItem.StartTime,
            EndTime = taskItem.EndTime,
            TimeType = taskItem.TimeType,
            IsDone = taskItem.IsDone,
            CompletedAt = taskItem.CompletedAt,
            CreatedAt = taskItem.CreatedAt,
            UpdatedAt = taskItem.UpdatedAt,
            DeletedAt = DateTime.UtcNow,
            UserId = taskItem.UserId,
            LabelId = taskItem.LabelId,
        };

        var recurringOverride = taskItem.RecurringOccurrenceOverride;
        if (recurringOverride?.OverrideType is RecurringOccurrenceOverrideType.Materialized
            or RecurringOccurrenceOverrideType.Modified)
        {
            recurringOverride.OverrideType = RecurringOccurrenceOverrideType.Skipped;
            recurringOverride.UpdatedAt = DateTime.UtcNow;
        }
        else if (recurringOverride?.OverrideType == RecurringOccurrenceOverrideType.Detached)
        {
            db.RecurringOccurrenceOverrides.Remove(recurringOverride);
        }

        db.DeletedTaskItems.Add(deletedTask);
        db.TaskItems.Remove(taskItem);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Task {TaskId} was successfully deleted", command.TaskId);

        return "Task deleted successfully.";
    }
}

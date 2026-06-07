using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Services;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class EditTaskCommand
{
    [Required] public int TaskId { get; init; }

    [Required] public required EditTaskItemDto TaskDetails { get; init; }
    [Required] public required Guid UserId { get; init; }
}

public class EditTaskCommandHandler(
    BlotzTaskDbContext db,
    TaskItemUpdater taskItemUpdater,
    ILogger<EditTaskCommandHandler> logger)
{
    public async Task<string> Handle(EditTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Editing task {TaskId}", command.TaskId);

        var task = await db.TaskItems
            .Include(t=>t.Deadline)
            .Include(t => t.RecurringOccurrenceOverride)
            .FirstOrDefaultAsync(t => t.Id == command.TaskId && t.UserId == command.UserId, ct);

        if (task == null) throw new NotFoundException($"Task with ID {command.TaskId} not found.");

        taskItemUpdater.Apply(task, command.TaskDetails);
        if (task.RecurringOccurrenceOverride != null)
        {
            task.RecurringOccurrenceOverride.OverrideType = RecurringOccurrenceOverrideType.Modified;
            task.RecurringOccurrenceOverride.UpdatedAt = DateTime.UtcNow;
        }

        db.TaskItems.Update(task);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Task {TaskId} was successfully edited", command.TaskId);

        return "Task edited successfully.";
    }
}

public class EditTaskItemDto
{
    [Required]
    [StringLength(200, ErrorMessage = "Title cannot be longer than 200 characters.")]
    public required string Title { get; set; }

    public string? Description { get; set; }
    public required DateTimeOffset StartTime { get; set; }
    public required DateTimeOffset EndTime { get; set; }
    public required TaskTimeType TimeType { get; set; }
    public int? LabelId { get; set; }
    public string? NotificationId { get; set; }
    public DateTimeOffset? AlertTime { get; set; }
    public bool? IsDeadline { get; set; }
    public DateTimeOffset? DueAt { get; set; }
}

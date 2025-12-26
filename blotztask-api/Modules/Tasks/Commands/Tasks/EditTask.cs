using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Shared;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class EditTaskCommand
{
    [Required] public int TaskId { get; init; }

    [Required] public required EditTaskItemDto TaskDetails { get; init; }
    [Required] public required Guid UserId { get; init; }
}

public class EditTaskCommandHandler(BlotzTaskDbContext db, ILogger<EditTaskCommandHandler> logger)
{
    public async Task<string> Handle(EditTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Editing task {TaskId}", command.TaskId);

        var task = await db.TaskItems
            .FirstOrDefaultAsync(t => t.Id == command.TaskId && t.UserId == command.UserId, ct);

        if (task == null) throw new NotFoundException($"Task with ID {command.TaskId} not found.");

        TaskTimeValidator.ValidateTaskTimes(command.TaskDetails.StartTime, command.TaskDetails.EndTime,
            command.TaskDetails.TimeType);

        task.Title = command.TaskDetails.Title;
        task.Description = command.TaskDetails.Description;
        task.StartTime = command.TaskDetails.StartTime;
        task.EndTime = command.TaskDetails.EndTime;
        task.TimeType = command.TaskDetails.TimeType;
        task.NotificationId = command.TaskDetails.NotificationId;
        task.AlertTime = command.TaskDetails.AlertTime;
        task.UpdatedAt = DateTime.UtcNow;
        task.LabelId = command.TaskDetails.LabelId;


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
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public TaskTimeType? TimeType { get; set; }
    public int? LabelId { get; set; }
    public string? NotificationId { get; set; }
    public DateTimeOffset? AlertTime { get; set; }
}

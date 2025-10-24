using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Shared;
using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class EditTaskCommand
{
    [Required]
    public int TaskId { get; init; }
    [Required]
    public required EditTaskItemDto TaskDetails { get; init; }
}

public class EditTaskCommandHandler(BlotzTaskDbContext db, ILogger<EditTaskCommandHandler> logger)
{
    public async Task<string> Handle(EditTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Editing task {TaskId}", command.TaskId);

        var task = await db.TaskItems.FindAsync(command.TaskId, ct);

        if (task == null)
        {
            throw new NotFoundException($"Task with ID {command.TaskId} not found.");
        }

        TaskTimeValidator.ValidateTaskTimes(command.TaskDetails.StartTime, command.TaskDetails.EndTime, command.TaskDetails.TimeType);

        task.Title = command.TaskDetails.Title;
        task.Description = command.TaskDetails.Description;
        task.StartTime = command.TaskDetails.StartTime;
        task.EndTime = command.TaskDetails.EndTime;
        task.TimeType = command.TaskDetails.TimeType;
        task.UpdatedAt = DateTime.UtcNow;
        task.LabelId = command.TaskDetails.LabelId;
        
        // Remove all subtasks related to this task
        var subtasks = db.Subtasks.Where(st => st.ParentTaskId == task.Id);
        db.Subtasks.RemoveRange(subtasks);


        db.TaskItems.Update(task);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Task {TaskId} was successfully edited", command.TaskId);

        return "Task edited successfully.";
    }
}

public class EditTaskItemDto
{
    public int Id { get; set; }
    [Required]
    [StringLength(200, ErrorMessage = "Title cannot be longer than 200 characters.")]
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public TaskTimeType? TimeType { get; set; }
    public int? LabelId { get; set; }
}
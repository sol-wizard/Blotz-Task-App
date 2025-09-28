using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Shared;
using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class AddTaskCommand
{
    [Required]
    public required AddTaskItemDto TaskDetails { get; init; }
    [Required]
    public required Guid UserId { get; set; }
}

public class AddTaskCommandHandler(BlotzTaskDbContext db, ILogger<AddTaskCommandHandler> logger)
{
    public async Task<string> Handle(AddTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Adding new task for user {UserId}", command.UserId);

        TaskTimeValidator.ValidateTaskTimes(command.TaskDetails.StartTime, command.TaskDetails.EndTime, command.TaskDetails.TimeType);

        var newTask = new TaskItem
        {
            Title = command.TaskDetails.Title,
            Description = command.TaskDetails.Description,
            StartTime = command.TaskDetails.StartTime,
            EndTime = command.TaskDetails.EndTime,
            TimeType = command.TaskDetails.TimeType,
            LabelId = command.TaskDetails.LabelId,
            UserId = command.UserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.TaskItems.Add(newTask);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Task {Id} was successfully added for user {UserId}", newTask.Id, command.UserId);

        return $"Task {newTask.Id} titled {newTask.Title} was successfully added.";
    }
}

public class AddTaskItemDto
{
    public required string Title { get; set; }
    public required string Description { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public TaskTimeType? TimeType { get; set; }
    public int LabelId { get; set; }
}
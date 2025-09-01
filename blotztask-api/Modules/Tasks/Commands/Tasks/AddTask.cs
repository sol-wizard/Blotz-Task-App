using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.DTOs;
using BlotzTask.Shared.DTOs;
using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class AddTaskCommand
{
    [Required]
    public required AddTaskItemDto TaskDetails { get; set; }
    [Required]
    public required string UserId { get; set; }
}

public class AddTaskCommandHandler(BlotzTaskDbContext db, ILogger<AddTaskCommandHandler> logger)
{
    public async Task<string> Handle(AddTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Adding new task for user {UserId}", command.UserId);

        var newTask = new TaskItem
        {
            Title = command.TaskDetails.Title,
            Description = command.TaskDetails.Description,
            StartTime = command.TaskDetails.StartTime,
            EndTime = command.TaskDetails.EndTime,
            LabelId = command.TaskDetails.LabelId,
            UserId = command.UserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            HasTime = command.TaskDetails.HasTime
        };

        db.TaskItems.Add(newTask);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Task {Id} was successfully added for user {UserId}", newTask.Id, command.UserId);

        return $"Task {newTask.Id} titled {newTask.Title} was successfully added.";
    }
}
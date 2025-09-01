using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.DTOs;
using BlotzTask.Shared.DTOs;
using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Tasks.Commands.Tasks;

public class AddTaskCommand
{
    [Required]
    public required AddTaskItemDto Dto { get; set; }
    [Required]
    public string UserId { get; set; } = string.Empty;
}

public class AddTaskCommandHandler(BlotzTaskDbContext db, ILogger<AddTaskCommandHandler> logger)
{
    public async Task<string> Handle(AddTaskCommand command, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.UserId))
        {
            throw new UnauthorizedAccessException("User ID cannot be null or empty.");
        }

        logger.LogInformation("Adding new task for user {UserId}", command.UserId);

        try
        {
            var newTask = new TaskItem
            {
                Title = command.Dto.Title,
                Description = command.Dto.Description,
                StartTime = command.Dto.StartTime,
                EndTime = command.Dto.EndTime,
                LabelId = command.Dto.LabelId,
                UserId = command.UserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                HasTime = command.Dto.HasTime
            };

            db.TaskItems.Add(newTask);
            await db.SaveChangesAsync(ct);

            logger.LogInformation("Task {Id} was successfully added for user {UserId}", newTask.Id, command.UserId);

            return $"Task {newTask.Id} titled {newTask.Title} was successfully added.";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error adding task for user {UserId}: {Message}", command.UserId, ex.Message);
            throw;
        }
    }
}
using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.DTOs;
using Microsoft.EntityFrameworkCore;

public class AddSubtasksCommand
{
    [Required]
    public int TaskId { get; set; } // Parent Task ID
    [Required]
    public List<SubtaskDto> Subtasks { get; set; } = new();
}

public class AddSubtasksCommandHandler(BlotzTaskDbContext db, ILogger<AddSubtasksCommandHandler> logger)
{
    public async Task<string> Handle(AddSubtasksCommand command, CancellationToken ct = default)
    {
        logger?.LogInformation("Adding subtasks to task {TaskId}", command.TaskId);
        var parentTask = await db.TaskItems
            .FirstOrDefaultAsync(t => t.Id == command.TaskId, ct);

        if (parentTask == null)
            throw new Exception($"Parent task {command.TaskId} not found.");

        var now = DateTime.UtcNow;
        
        foreach (var dto in command.Subtasks)
        {
            var subtask = new Subtask
            {
                Title = dto.Title,
                Description = dto.Description,
                Duration = dto.Duration,
                Order = dto.Order,
                IsDone = dto.IsDone,
                ParentTaskId = parentTask.Id,
                CreatedAt = now,
                UpdatedAt = now
            };
            
            db.Subtasks.Add(subtask);
        }
        
        await db.SaveChangesAsync(ct);
        
        logger?.LogInformation("{Count} subtasks added to task {TaskId}", command.Subtasks.Count, parentTask.Id);
        return $"{command.Subtasks.Count} subtasks added to task {parentTask.Id}.";
    }
}

public class SubtaskDto
{ 
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TimeSpan? Duration { get; set; }
    public int Order { get; set; }
    public bool IsDone { get; set; } = false; // default for new subtasks
}
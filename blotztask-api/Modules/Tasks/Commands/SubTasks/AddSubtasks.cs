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

public class AddSubtasksCommandHandler
{
    private readonly BlotzTaskDbContext _db;

    public AddSubtasksCommandHandler(BlotzTaskDbContext db)
    {
        _db = db;
    }

    public async Task<string> Handle(AddSubtasksCommand command, CancellationToken ct = default)
    {
        // Load parent task including existing subtasks
        var parentTask = await _db.TaskItems
            .Include(t => t.Subtasks) // Include existing subtasks
            .FirstOrDefaultAsync(t => t.Id == command.TaskId, ct);

        if (parentTask == null)
            throw new Exception($"Parent task {command.TaskId} not found.");

        var now = DateTime.UtcNow;

        // Map DTOs to Subtask entities
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
            
            parentTask.Subtasks.Add(subtask);
        }

        // Save all changes
        await _db.SaveChangesAsync(ct);

        return $"{command.Subtasks.Count} subtasks added to task {parentTask.Id}.";
    }
}
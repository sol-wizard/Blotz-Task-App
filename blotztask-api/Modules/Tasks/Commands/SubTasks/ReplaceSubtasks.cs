using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Shared;
using Microsoft.EntityFrameworkCore;

public class ReplaceSubtasksCommand
{
    [Required]
    public int TaskId { get; set; } // Parent Task ID
    [Required]
    public List<SubtaskDto> Subtasks { get; set; } = new();
}

public class ReplaceSubtasksCommandHandler
{
    private readonly BlotzTaskDbContext _db;

    public ReplaceSubtasksCommandHandler(BlotzTaskDbContext db)
    {
        _db = db;
    }

    public async Task<string> Handle(ReplaceSubtasksCommand command, CancellationToken ct = default)
    {
        var parentTask = await _db.TaskItems
            .FirstOrDefaultAsync(t => t.Id == command.TaskId, ct);

        if (parentTask == null)
            throw new Exception($"Parent task {command.TaskId} not found.");

        var existingSubtasks = await _db.Subtasks
            .Where(s => s.ParentTaskId == parentTask.Id)
            .ToListAsync(ct);

        _db.Subtasks.RemoveRange(existingSubtasks);

        var now = DateTime.UtcNow;

        foreach (var dto in command.Subtasks)
        {
            var duration = TimeSpanHelper.ParseDuration(dto.Duration);
            if (!duration.HasValue)
            {
                throw new Exception($"Duration {dto.Duration} is invalid.");
            }

            var subtask = new Subtask
            {
                Title = dto.Title,
                Description = dto.Description,
                Duration = duration,
                Order = dto.Order,
                IsDone = false,
                ParentTaskId = parentTask.Id,
                CreatedAt = now,
                UpdatedAt = now
            };
        
            _db.Subtasks.Add(subtask);

        }

        await _db.SaveChangesAsync(ct);


        return $"{command.Subtasks.Count} subtasks added to task {parentTask.Id}.";
    }
}

public class SubtaskDto
{
    public required string Title { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public int Order { get; set; }
}
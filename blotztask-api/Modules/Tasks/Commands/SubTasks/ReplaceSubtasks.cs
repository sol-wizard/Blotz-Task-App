using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Infrastructure.Data;
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

        var newSubtasks = command.Subtasks.Select(dto => new Subtask
        {
            Title = dto.Title,
            Description = dto.Description,
            Duration = dto.Duration,
            Order = dto.Order,
            IsDone = false,
            ParentTaskId = parentTask.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        }).ToList();

        _db.Subtasks.AddRange(newSubtasks);
        await _db.SaveChangesAsync(ct);

        return $"{command.Subtasks.Count} subtasks added to task {parentTask.Id}.";
    }
}

public class SubtaskDto
{
    public required string Title { get; set; }
    public string Description { get; set; } = string.Empty;
    public TimeSpan Duration { get; set; }
    public int Order { get; set; }
}
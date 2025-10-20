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
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var parentTask = await _db.TaskItems
                .FirstOrDefaultAsync(t => t.Id == command.TaskId, ct);

            if (parentTask == null)
                throw new Exception($"Parent task {command.TaskId} not found.");
            
            // TODO: Update this using the delete handler
            await _db.Subtasks
                .Where(s => s.ParentTaskId == parentTask.Id)
                .ExecuteDeleteAsync(ct);
            
            // TODO: Update this using the add handler
            var now = DateTime.UtcNow;
            var newSubtasks = command.Subtasks.Select(dto => new Subtask
            {
                Title = dto.Title,
                Description = dto.Description,
                Duration = dto.Duration,
                Order = dto.Order,
                IsDone = false,
                ParentTaskId = parentTask.Id,
                CreatedAt = now,
                UpdatedAt = now
            }).ToList();

            _db.Subtasks.AddRange(newSubtasks);
            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return $"{command.Subtasks.Count} subtasks added to task {parentTask.Id}.";
        }

        catch (Exception)
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }
}

public class SubtaskDto
{
    public required string Title { get; set; }
    public string Description { get; set; } = string.Empty;
    public TimeSpan Duration { get; set; }
    public int Order { get; set; }
}
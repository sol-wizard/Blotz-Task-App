using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Shared;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.SubTasks;

public class GetSubtasksByTaskIdQuery
{
    [Required]
    public required int TaskId { get; init; }
}

public class GetSubtasksByTaskIdQueryHandler(BlotzTaskDbContext db)
{
    public async Task<List<SubtaskDetailDto>?> Handle(GetSubtasksByTaskIdQuery query, CancellationToken ct = default)
    {
        var taskExists = await db.TaskItems
            .AsNoTracking()
            .AnyAsync(x => x.Id == query.TaskId, ct);
        
        if (!taskExists)
            return null;
        
        var subtasks = await db.Subtasks
            .AsNoTracking()
            .Where(t => t.ParentTaskId == query.TaskId)
            .Select(t => new SubtaskDetailDto
            {
                SubTaskId = t.Id,
                ParentTaskId = t.ParentTaskId,
                Title = t.Title,
                Description = t.Description,
                Duration = t.Duration,
                Order = t.Order,
                IsDone = t.IsDone
            })
            .ToListAsync(ct);

        return subtasks;
    }
}
public class SubtaskDetailDto
{
    public int SubTaskId { get; set; }
    public int ParentTaskId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; } = string.Empty;
    public TimeSpan? Duration { get; set; }
    public int Order { get; set; }
    public bool IsDone { get; set; }
}
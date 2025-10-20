using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Shared;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.SubTasks;

public class GetSubtasksByTaskIdQuery
{
    [Required]
    public required int SubTaskId { get; init; }
}

public class GetSubtasksByTaskIdQueryHandler(BlotzTaskDbContext db, ILogger<GetSubtasksByTaskIdQueryHandler> logger)
{
    private readonly ILogger<GetSubtasksByTaskIdQueryHandler> _logger = logger;

    public async Task<List<SubtaskReadDto>> Handle(GetSubtasksByTaskIdQuery query, CancellationToken ct = default)
    {
        var subTasks = await db.TaskItems
            .Where(t => t.Id == query.SubTaskId)
            .SelectMany(t => t.Subtasks, (t, s) => new SubtaskReadDto
            {
                SubTaskId = s.Id,
                ParentTaskId = t.Id,
                Title = s.Title,
                Description = s.Description,
                Duration = s.Duration,
                Order = s.Order,
                IsDone = s.IsDone
            })
            .ToListAsync(ct);

        return subTasks;
    }
}
public class SubtaskReadDto
{
    public int SubTaskId { get; set; }
    public int ParentTaskId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; } = string.Empty;
    public TimeSpan? Duration { get; set; }
    public int Order { get; set; }
    public bool IsDone { get; set; }
}
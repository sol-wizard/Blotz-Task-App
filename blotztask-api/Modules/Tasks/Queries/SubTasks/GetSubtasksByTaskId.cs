using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.BreakDown;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.SubTasks;


public class GetSubtasksByTaskIdQuery
{
    [Required]
    public Guid UserId { get; init; }
    [Required]
    public int TaskId { get; init; }
}

public class SubTasksDto
{
    public int Id { get; init; }
    public string Title { get; init; }
    public bool IsDone { get; init; }
    public int Order { get; init; }
}

public class GetSubtasksByTaskIdQueryHandler(BlotzTaskDbContext db, ILogger<GetSubtasksByTaskIdQueryHandler> logger)
{
    public async Task<IEnumerable<SubTasksDto>> Handle(GetSubtasksByTaskIdQuery query, CancellationToken ct)
    {
        var task = await db.TaskItems
            .FirstOrDefaultAsync(t => t.Id == query.TaskId && t.UserId == query.UserId, ct);
        if (task is null)
        {
            logger.LogError("Task with task id not found");
            return Enumerable.Empty<SubTasksDto>();
        }

        var subtasks = await db.Subtasks
            .Where(st => st.ParentTaskId == query.TaskId)
            .OrderBy(st => st.Order)
            .Select(st => new SubTasksDto
            {
                Id = st.Id,
                Title = st.Title,
                IsDone = st.IsDone,
                Order = st.Order
            })
            .ToListAsync(ct);

        return subtasks;

    }


}
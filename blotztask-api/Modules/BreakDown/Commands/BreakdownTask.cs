using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.BreakDown.Services;
using BlotzTask.Modules.Tasks.Queries.Tasks;

namespace BlotzTask.Modules.BreakDown.Commands;

public class BreakdownTaskCommand
{
    [Required]
    public required int TaskId { get; init; }
}

public class BreakdownTaskCommandHandler(
    ILogger<BreakdownTaskCommandHandler> logger,
    GetTaskByIdQueryHandler getTaskByIdQueryHandler,
    ITaskBreakdownService taskBreakdownService)
{
    public async Task<List<SubTask>> Handle(BreakdownTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Breaking down task {TaskId}", command.TaskId);

        var query = new GetTasksByIdQuery { TaskId = command.TaskId };
        var task = await getTaskByIdQueryHandler.Handle(query, ct);

        if (task == null)
        {
            throw new ArgumentException($"Task with ID {command.TaskId} not found.");
        }

        return await taskBreakdownService.BreakdownTaskAsync(
            task.Title,
            task.Description,
            task.StartTime?.DateTime,
            task.EndTime?.DateTime,
            ct
        );
    }
}
public class SubTask
{
    public string Title { get; set; } = string.Empty;
    public TimeSpan Duration { get; set; }
    public int Order { get; set; }
}

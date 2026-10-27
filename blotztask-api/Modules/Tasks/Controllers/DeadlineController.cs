using BlotzTask.Modules.Tasks.Commands.DeadlineTasks;
using BlotzTask.Modules.Tasks.Queries.Deadlines;
using BlotzTask.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[Route("/api/[controller]")]
public class DeadlineController(
    GetAllDdlTasksQueryHandler getAllDdlTasksQueryHandler,
    UpdateDeadlinePinCommandHandler updateDeadlinePinCommandHandler,
    DeleteDeadlineTaskCommandHandler deleteDeadlineTaskCommandHandler,
    ILogger<DeadlineController> logger
) : AuthorizedControllerBase
{
    private readonly ILogger<DeadlineController> _logger = logger;

    [HttpGet("all")]
    public async Task<IEnumerable<DeadlineTaskDto>> GetAllDdlTasks(
        [FromQuery] GetAllDdlTasksRequest request,
        CancellationToken ct)
    {
        var userId = UserId;

        var query = new GetAllDdlTasksQuery { UserId = userId, TimeZoneId = request.TimeZoneId };
        return await getAllDdlTasksQueryHandler.Handle(query, ct);
    }

    [HttpPatch("{taskId}/pin")]
    public async Task<IActionResult> UpdatePin(int taskId,
        [FromBody] UpdateDeadlinePinCommand command, CancellationToken ct)
    {
        var userId = UserId;

        command.TaskId = taskId;
        command.UserId = userId;
        
        await updateDeadlinePinCommandHandler.Handle(command, ct);

        return NoContent();
    }

    [HttpDelete("{TaskId}")]
    public async Task<string> DeleteDeadlineTask([FromRoute] DeleteDeadlineTaskCommand command, CancellationToken ct)
    {
        var userId = UserId;
        
        return await deleteDeadlineTaskCommandHandler.Handle(command, ct);
    }

}

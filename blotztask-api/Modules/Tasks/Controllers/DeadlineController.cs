using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Queries.Deadlines;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class DeadlineController(
    GetAllDdlTasksQueryHandler getAllDdlTasksQueryHandler,
    UpdateDeadlinePinCommandHandler updateDeadlinePinCommandHandler,
    DeleteDeadlineTaskCommandHandler deleteDeadlineTaskCommandHandler,
    ILogger<DeadlineController> logger
) : ControllerBase
{
    private readonly ILogger<DeadlineController> _logger = logger;

    [HttpGet("all")]
    public async Task<IEnumerable<DeadlineTaskDto>> GetAllDdlTasks(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetAllDdlTasksQuery { UserId = userId };
        return await getAllDdlTasksQueryHandler.Handle(query, ct);
    }

    [HttpPatch("{taskId}/pin")]
    public async Task<UpdateDeadlinePinDto> UpdatePin(int taskId,
        [FromBody] UpdateDeadlinePinDto updateDeadlinePin, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new UpdateDeadlinePinCommand
        {
            TaskId = taskId,
            IsPinned = updateDeadlinePin.IsPinned,
        };
        
        var result = await updateDeadlinePinCommandHandler.Handle(command, ct);
        
        if (result is null)
        {
            throw new InvalidOperationException($"Deadline Task pin update failed: no valid data returned for task ID {taskId}.");
        }

        return result;

    }

    [HttpDelete("{taskId}")]
    public async Task<string> DeleteDeadlineTask(int taskId, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new DeleteDeadlineTaskCommand { TaskId = taskId };
        
        return await deleteDeadlineTaskCommandHandler.Handle(command, ct);
    }

}

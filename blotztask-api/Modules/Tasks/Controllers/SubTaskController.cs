using BlotzTask.Modules.Tasks.Commands.SubTasks;
using BlotzTask.Modules.Tasks.Queries.SubTasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SubTaskController(UpdateSubtaskCommandHandler updateSubtaskCommandHandler, AddSubtasksCommandHandler addSubtasksCommandHandler, GetSubtasksByTaskIdHandler getSubtasksByTaskIdHandler) : ControllerBase
{
    [HttpPut("{taskId}/subtasks/{subtaskId}")]
    public async Task<IActionResult> UpdateSubtask(
        int taskId,
        int subtaskId,
        [FromBody] UpdateSubtaskCommand command,
        CancellationToken ct)
    {
        if (taskId != command.TaskId || subtaskId != command.SubtaskId)
        {
            return BadRequest("TaskId or SubtaskId in route does not match request body.");
        }

        var message = await updateSubtaskCommandHandler.Handle(command, ct);
        return Ok(message);
    }

    [HttpPost("tasks/{taskId}/subtasks")]
    public async Task<IActionResult> AddSubtasks(
        int taskId,
        [FromBody] AddSubtasksCommand command,
        CancellationToken ct)
    {
        if (taskId != command.TaskId)
        {
            return BadRequest("TaskId in route does not match request body.");
        }
        var message = await addSubtasksCommandHandler.Handle(command, ct);
        return Ok(message);
    }

    [HttpGet("tasks/{taskId}/subtasks")]
    public async Task<IActionResult> GetSubtasksByTaskId([FromRoute] int taskId, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        var query = new GetSubtasksByTaskIdQuery
        {
            UserId = userId,
            TaskId = taskId
        };
        var results = await getSubtasksByTaskIdHandler.Handle(query, ct);
        return Ok(results);
    }
        
}
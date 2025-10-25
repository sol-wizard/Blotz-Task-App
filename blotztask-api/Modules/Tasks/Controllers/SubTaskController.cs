using BlotzTask.Modules.Tasks.Commands.SubTasks;
using BlotzTask.Modules.Tasks.Queries.SubTasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SubTaskController(GetSubtasksByTaskIdQueryHandler getSubtaskByTaskIdQueryHandler, UpdateSubtaskCommandHandler updateSubtaskCommandHandler, ReplaceSubtasksCommandHandler replaceSubtasksCommandHandler) : ControllerBase
{
    [HttpGet("tasks/{id}")]
    public async Task<IActionResult> GetSubtasksById(int id, CancellationToken ct)
    {
        var query = new GetSubtasksByTaskIdQuery { TaskId = id };
        var subtasks = await getSubtaskByTaskIdQueryHandler.Handle(query, ct);
        if (subtasks == null)
            return NotFound("Task not found");
        return Ok(subtasks);
    }

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

    [HttpPost("tasks/{taskId}/replaceSubtasks")]
    public async Task<IActionResult> ReplaceSubtasks(
        int taskId,
        [FromBody] ReplaceSubtasksCommand command,
        CancellationToken ct)
    {
        if (taskId != command.TaskId)
        {
            return BadRequest("TaskId in route does not match request body.");
        }
        var message = await replaceSubtasksCommandHandler.Handle(command, ct);
        return Ok(message);
    }

}
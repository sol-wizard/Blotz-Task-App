using BlotzTask.Modules.Tasks.Commands.SubTasks;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubTaskController(UpdateSubtaskHandler updateHandler) : ControllerBase
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

        var message = await updateHandler.Handle(command, ct);
        return Ok(new { message });
    }
}
using BlotzTask.Modules.Tasks.Commands.SubTasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SubTaskController(UpdateSubtaskCommandHandler updateSubtaskCommandHandler, AddSubtasksCommandHandler addSubtasksCommandHandler, ILogger<SubTaskController> logger) : ControllerBase
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
        logger.LogInformation("Received request to add {Count} subtasks to task {TaskId}", command.Subtasks.Count, command.TaskId);
        // return Ok(message);
        return Ok(new { 
            message = message, 
            count = command.Subtasks.Count,
            taskId = command.TaskId
        });
    }
        
}
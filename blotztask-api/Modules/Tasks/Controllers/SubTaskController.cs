using BlotzTask.Modules.Tasks.Commands.SubTasks;
using BlotzTask.Modules.Tasks.Queries.SubTasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SubTaskController(
    GetSubtasksByTaskIdQueryHandler getSubtaskByTaskIdQueryHandler,
    UpdateSubtaskCommandHandler updateSubtaskCommandHandler,
    UpdateSubtaskStatusCommandHandler updateSubtaskStatusCommandHandler,
    ReplaceSubtasksCommandHandler replaceSubtasksCommandHandler,
    DeleteSubtaskCommandHandler deleteSubtaskCommandHandler) : ControllerBase
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

    [HttpPut("tasks/{taskId}/subtasks/{subtaskId}")]
    public async Task<IActionResult> UpdateSubtask(
        int taskId,
        int subtaskId,
        [FromBody] UpdateSubtaskCommand command,
        CancellationToken ct)
    {
        var message = await updateSubtaskCommandHandler.Handle(command, taskId, subtaskId, ct);
        return Ok(new { message });
    }

    [HttpPut("subtask-completion-status/{id}")]
    public async Task<IActionResult> UpdateSubtaskStatus(int id, CancellationToken ct)
    {
        var message = await updateSubtaskStatusCommandHandler.Handle(id, ct);
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

    [HttpDelete("subtasks/{subtaskId}")]
    public async Task<IActionResult> DeleteSubtask(int subtaskId, CancellationToken ct)
    {
        var command = new DeleteSubtaskCommand { SubtaskId = subtaskId };
        var result = await deleteSubtaskCommandHandler.Handle(command, ct);
        return Ok(result);
    }

}
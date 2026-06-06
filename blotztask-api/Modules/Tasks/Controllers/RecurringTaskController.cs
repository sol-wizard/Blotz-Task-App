using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RecurringTaskController(
    CreateRecurringTaskCommandHandler createRecurringTaskCommandHandler,
    SaveRecurringOccurrenceCommandHandler saveRecurringOccurrenceCommandHandler,
    MaterializeRecurringOccurrenceCommandHandler materializeRecurringOccurrenceCommandHandler,
    UpdateRecurringOccurrenceCommandHandler updateRecurringOccurrenceCommandHandler) : ControllerBase
{
    [HttpPost]
    public async Task<int> CreateRecurringTask(
        [FromBody] CreateRecurringTaskRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var command = new CreateRecurringTaskCommand
        {
            UserId = userId,
            TaskDetails = request
        };

        return await createRecurringTaskCommandHandler.Handle(command, ct);
    }

    [HttpPost("occurrence/complete")]
    public async Task<IActionResult> CompleteOccurrence(
        [FromBody] SaveRecurringOccurrenceRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var command = new SaveRecurringOccurrenceCommand
        {
            RecurringTaskId = request.RecurringTaskId,
            OccurrenceDate = request.OccurrenceDate,
            UserId = userId
        };

        var taskItemId = await saveRecurringOccurrenceCommandHandler.Handle(command, ct);
        return Ok(new { taskItemId });
    }

    [HttpPost("occurrence/materialize")]
    public async Task<IActionResult> MaterializeOccurrence(
        [FromBody] MaterializeRecurringOccurrenceRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var command = new MaterializeRecurringOccurrenceCommand
        {
            RecurringTaskId = request.RecurringTaskId,
            OccurrenceDate = request.OccurrenceDate,
            UserId = userId
        };

        var taskItemId = await materializeRecurringOccurrenceCommandHandler.Handle(command, ct);
        return Ok(new { taskItemId });
    }

    [HttpPut("occurrence")]
    public async Task<IActionResult> UpdateOccurrence(
        [FromBody] UpdateRecurringOccurrenceRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var command = new UpdateRecurringOccurrenceCommand
        {
            RecurringTaskId = request.RecurringTaskId,
            OccurrenceDate = request.OccurrenceDate,
            TaskDetails = request.TaskDetails,
            UserId = userId
        };

        var taskItemId = await updateRecurringOccurrenceCommandHandler.Handle(command, ct);
        return Ok(new { taskItemId });
    }

    private Guid GetUserId()
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        return userId;
    }
}

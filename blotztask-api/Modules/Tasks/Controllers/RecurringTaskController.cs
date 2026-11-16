using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[Route("api/[controller]")]
public class RecurringTaskController(
    CreateRecurringTaskCommandHandler createRecurringTaskCommandHandler,
    SaveRecurringOccurrenceCommandHandler saveRecurringOccurrenceCommandHandler,
    MaterializeRecurringOccurrenceCommandHandler materializeRecurringOccurrenceCommandHandler,
    UpdateRecurringOccurrenceCommandHandler updateRecurringOccurrenceCommandHandler,
    UpdateRecurringTaskFutureCommandHandler updateRecurringTaskFutureCommandHandler,
    DeleteRecurringOccurrenceCommandHandler deleteRecurringOccurrenceCommandHandler) : AuthorizedControllerBase
{
    [HttpPost]
    public async Task<CreateRecurringTaskResult> CreateRecurringTask(
        [FromBody] CreateRecurringTaskRequest request,
        CancellationToken ct)
    {
        var userId = UserId;
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
        var userId = UserId;
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
        var userId = UserId;
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
        var userId = UserId;
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

    [HttpPut("future")]
    public async Task<IActionResult> UpdateFutureOccurrences(
        [FromBody] UpdateRecurringTaskFutureRequest request,
        CancellationToken ct)
    {
        var userId = UserId;
        var command = new UpdateRecurringTaskFutureCommand
        {
            RecurringTaskId = request.RecurringTaskId,
            EffectiveDate = request.EffectiveDate,
            TaskDetails = request.TaskDetails,
            UserId = userId,
            StopRepeating = request.StopRepeating,
            Frequency = request.Frequency,
            Interval = request.Interval,
            DaysOfWeek = request.DaysOfWeek,
            DayOfMonth = request.DayOfMonth,
            EndDate = request.EndDate,
            EndDateChanged = request.EndDateChanged,
            ScheduleTimeZoneId = request.ScheduleTimeZoneId,
            DeadlineTimeZoneId = request.DeadlineTimeZoneId
        };

        var recurringTaskId = await updateRecurringTaskFutureCommandHandler.Handle(command, ct);
        return Ok(new { recurringTaskId });
    }

    [HttpPost("occurrence/delete")]
    public async Task<IActionResult> DeleteOccurrence(
        [FromBody] DeleteRecurringOccurrenceRequest request,
        CancellationToken ct)
    {
        var userId = UserId;
        var command = new DeleteRecurringOccurrenceCommand
        {
            RecurringTaskId = request.RecurringTaskId,
            OccurrenceDate = request.OccurrenceDate,
            DeleteFuture = request.DeleteFuture,
            UserId = userId
        };

        await deleteRecurringOccurrenceCommandHandler.Handle(command, ct);
        return Ok();
    }
}

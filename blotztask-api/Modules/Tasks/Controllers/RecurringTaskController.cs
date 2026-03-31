using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecurringTaskController(SaveRecurringOccurrenceCommandHandler saveRecurringOccurrenceCommandHandler,
    AddRecurringTaskCommandHandler addRecurringTaskCommandHandler) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] AddRecurringTaskCommand command,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var addCommand = new AddRecurringTaskCommand
        {
            UserId = userId,
            Title = command.Title,
            Description = command.Description,
            TimeType = command.TimeType,
            LabelId = command.LabelId,
            TemplateStartTime = command.TemplateStartTime,
            TemplateEndTime = command.TemplateEndTime,
            Frequency = command.Frequency,
            Interval = command.Interval,
            DaysOfWeek = command.DaysOfWeek,
            DayOfMonth = command.DayOfMonth,
            StartDate = command.StartDate,
            EndDate = command.EndDate
        };

        var id = await addRecurringTaskCommandHandler.Handle(addCommand, ct);
        return Ok(new { id });
    }
    
    [HttpPost("occurrence/complete")]
    public async Task<IActionResult> CompleteOccurrence(
        [FromBody] SaveRecurringOccurrenceCommand command,
        CancellationToken ct)
    {
        var taskItemId = await saveRecurringOccurrenceCommandHandler.Handle(command, ct);
        return Ok(new { taskItemId });
    }
}

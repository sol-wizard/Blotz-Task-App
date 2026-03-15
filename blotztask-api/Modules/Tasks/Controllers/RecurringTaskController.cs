using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecurringTaskController(SaveRecurringOccurrenceCommandHandler saveRecurringOccurrenceCommandHandler) : ControllerBase
{
    [HttpPost("occurrence/complete")]
    public async Task<IActionResult> CompleteOccurrence(
        [FromBody] SaveRecurringOccurrenceCommand command,
        CancellationToken ct)
    {
        var taskItemId = await saveRecurringOccurrenceCommandHandler.Handle(command, ct);
        return Ok(new { taskItemId });
    }
}

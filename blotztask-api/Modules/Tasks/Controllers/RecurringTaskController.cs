using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecurringTaskController(AddRecurringTaskCommandHandler addRecurringTaskCommandHandler) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> AddRecurringTask(CancellationToken ct)
    {
        var command = new AddRecurringTaskCommand
        {
            Timestamp = DateTime.UtcNow
        };
        var result = await addRecurringTaskCommandHandler.Handle(command, ct);

        return Ok(result);
    }
}
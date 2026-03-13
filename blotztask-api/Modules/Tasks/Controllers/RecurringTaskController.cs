using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecurringTaskController(GenerateRecurringTaskItemsCommandHandler generateRecurringTaskItemsCommandHandler) : ControllerBase
{
    [HttpPost("generate")]
    public async Task<IActionResult> GenerateTaskItems(CancellationToken ct)
    {
        var command = new GenerateRecurringTaskItemsCommand
        {
            Timestamp = DateTime.UtcNow
        };
        var result = await generateRecurringTaskItemsCommandHandler.Handle(command, ct);

        return Ok(result);
    }
}
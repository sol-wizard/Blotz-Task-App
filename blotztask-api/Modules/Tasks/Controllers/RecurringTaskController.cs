using BlotzTask.Modules.Tasks.Services;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecurringTaskController(IRecurringTaskService recurringTaskService) : ControllerBase
{
    [HttpPost("generate")]
    public async Task<IActionResult> GenerateTasks()
    {
        await recurringTaskService.GenerateRecurringTasksAsync(DateTime.UtcNow);

        return Ok("Recurring tasks generation triggered.");
    }
}
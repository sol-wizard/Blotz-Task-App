using BlotzTask.Modules.Tasks.Services;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecurringTaskController : ControllerBase
{
    private readonly IRecurringTaskService _recurringTaskService;

    public RecurringTaskController(IRecurringTaskService recurringTaskService)
    {
        _recurringTaskService = recurringTaskService;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateTasks()
    {
        await _recurringTaskService.GenerateRecurringTasksAsync(DateTime.UtcNow);

        return Ok("Recurring tasks generation triggered.");
    }
}
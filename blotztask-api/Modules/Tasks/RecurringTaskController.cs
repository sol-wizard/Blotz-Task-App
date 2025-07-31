using Microsoft.AspNetCore.Mvc;
using BlotzTask.Modules.Tasks.Services;

namespace BlotzTask.Modules.Tasks;

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
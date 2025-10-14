using BlotzTask.Modules.BreakDown.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.BreakDown.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TaskBreakdownController : ControllerBase
{
    private readonly BreakdownTaskCommandHandler _breakdownTaskCommandHandler;
    private readonly ILogger<TaskBreakdownController> _logger;

    public TaskBreakdownController(
        BreakdownTaskCommandHandler breakdownTaskCommandHandler,
        ILogger<TaskBreakdownController> logger)
    {
        _breakdownTaskCommandHandler = breakdownTaskCommandHandler;
        _logger = logger;
    }

    [HttpPost("{taskId}")]
    public async Task<List<SubTask>> BreakdownTask(string taskId, CancellationToken ct)
    {
        _logger.LogInformation("BreakdownTask called with taskId: {TaskId}", taskId);

        var command = new BreakdownTaskCommand
        {
            TaskId = int.Parse(taskId)
        };

        var result = await _breakdownTaskCommandHandler.Handle(command, ct);

        return result;
    }
}
using BlotzTask.Modules.BreakDown.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.BreakDown.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TaskBreakdownController : ControllerBase
{
    private readonly BreakdownTaskQueryHandler _breakdownTaskQueryHandler;
    private readonly ILogger<TaskBreakdownController> _logger;

    public TaskBreakdownController(
        BreakdownTaskQueryHandler breakdownTaskQueryHandler,
        ILogger<TaskBreakdownController> logger)
    {
        _breakdownTaskQueryHandler = breakdownTaskQueryHandler;
        _logger = logger;
    }

    [HttpGet("{taskId}")]
    public async Task<List<SubTask>> BreakdownTask(string taskId, CancellationToken ct)
    {
        _logger.LogInformation("BreakdownTask called with taskId: {TaskId}", taskId);

        var query = new GetTaskBreakdownQuery
        {
            TaskId = int.Parse(taskId)
        };

        var result = await _breakdownTaskQueryHandler.Handle(query, ct);

        return result;
    }
}
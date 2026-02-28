using BlotzTask.Modules.BreakDown.Commands;
using BlotzTask.Modules.BreakDown.DTOs;
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
    public async Task<BreakdownMessage> BreakdownTask(string taskId, CancellationToken ct)
    {
        _logger.LogInformation("BreakdownTask called with taskId: {TaskId}", taskId);

        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new BreakdownTaskCommand
        {
            TaskId = int.Parse(taskId),
            UserId = userId
        };

        var result = await _breakdownTaskCommandHandler.Handle(command, ct);

        return result;
    }
}
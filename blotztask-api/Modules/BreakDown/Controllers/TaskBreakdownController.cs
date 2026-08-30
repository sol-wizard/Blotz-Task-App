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
    private readonly BreakdownAndReplaceTaskCommandHandler _breakdownAndReplaceTaskCommandHandler;
    private readonly ILogger<TaskBreakdownController> _logger;

    public TaskBreakdownController(
        BreakdownTaskCommandHandler breakdownTaskCommandHandler,
        BreakdownAndReplaceTaskCommandHandler breakdownAndReplaceTaskCommandHandler,
        ILogger<TaskBreakdownController> logger)
    {
        _breakdownTaskCommandHandler = breakdownTaskCommandHandler;
        _breakdownAndReplaceTaskCommandHandler = breakdownAndReplaceTaskCommandHandler;
        _logger = logger;
    }

    [HttpPost]
    public async Task<BreakdownAndReplaceTaskResult> BreakdownAndReplaceTask(
        [FromBody] BreakdownAndReplaceTaskRequest request,
        CancellationToken ct)
    {
        _logger.LogInformation(
            "BreakdownAndReplaceTask called with taskId: {TaskId}, recurringTaskId: {RecurringTaskId}, occurrenceDate: {OccurrenceDate}",
            request.TaskId,
            request.RecurringTaskId,
            request.OccurrenceDate);

        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new BreakdownAndReplaceTaskCommand
        {
            TaskId = request.TaskId,
            RecurringTaskId = request.RecurringTaskId,
            OccurrenceDate = request.OccurrenceDate,
            UserId = userId
        };

        return await _breakdownAndReplaceTaskCommandHandler.Handle(command, ct);
    }

    [HttpPost("{taskId}")]
    public async Task<BreakdownResult> BreakdownTask(string taskId, CancellationToken ct)
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

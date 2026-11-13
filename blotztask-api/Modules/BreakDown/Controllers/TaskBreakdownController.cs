using BlotzTask.Modules.BreakDown.Commands;
using BlotzTask.Modules.BreakDown.DTOs;
using BlotzTask.Modules.BreakDown.Queries;
using BlotzTask.Modules.BreakDown.Services;
using BlotzTask.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.BreakDown.Controllers;

[Route("api/[controller]")]
public class TaskBreakdownController : AuthorizedControllerBase
{
    private readonly BreakdownTaskCommandHandler _breakdownTaskCommandHandler;
    private readonly BreakdownAndReplaceTaskCommandHandler _breakdownAndReplaceTaskCommandHandler;
    private readonly BreakdownTargetResolver _targetResolver;
    private readonly StartTaskBreakdownCommandHandler _startTaskBreakdownCommandHandler;
    private readonly GetTaskBreakdownStatusQueryHandler _getTaskBreakdownStatusQueryHandler;
    private readonly BreakdownJobQueue _breakdownJobQueue;
    private readonly ILogger<TaskBreakdownController> _logger;

    public TaskBreakdownController(
        BreakdownTaskCommandHandler breakdownTaskCommandHandler,
        BreakdownAndReplaceTaskCommandHandler breakdownAndReplaceTaskCommandHandler,
        BreakdownTargetResolver targetResolver,
        StartTaskBreakdownCommandHandler startTaskBreakdownCommandHandler,
        GetTaskBreakdownStatusQueryHandler getTaskBreakdownStatusQueryHandler,
        BreakdownJobQueue breakdownJobQueue,
        ILogger<TaskBreakdownController> logger)
    {
        _breakdownTaskCommandHandler = breakdownTaskCommandHandler;
        _breakdownAndReplaceTaskCommandHandler = breakdownAndReplaceTaskCommandHandler;
        _targetResolver = targetResolver;
        _startTaskBreakdownCommandHandler = startTaskBreakdownCommandHandler;
        _getTaskBreakdownStatusQueryHandler = getTaskBreakdownStatusQueryHandler;
        _breakdownJobQueue = breakdownJobQueue;
        _logger = logger;
    }

    // Old one-request breakdown, still used by app 1.4.0. The app gives up after its own timeout.
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

        var userId = UserId;

        var command = new BreakdownAndReplaceTaskCommand
        {
            TaskId = request.TaskId,
            RecurringTaskId = request.RecurringTaskId,
            OccurrenceDate = request.OccurrenceDate,
            UserId = userId
        };

        return await _breakdownAndReplaceTaskCommandHandler.Handle(command, ct);
    }

    // Starts a breakdown in the background and replies at once. The app then polls the status endpoint.
    [HttpPost("start")]
    public async Task<ActionResult<TaskBreakdownStatusDto>> StartBreakdown(
        [FromBody] BreakdownAndReplaceTaskRequest request,
        CancellationToken ct)
    {
        var userId = UserId;
        var taskItemId = await _targetResolver.ResolveTaskItemId(
            request.TaskId, request.RecurringTaskId, request.OccurrenceDate, userId, ct);

        var start = await _startTaskBreakdownCommandHandler.Handle(new StartTaskBreakdownCommand
        {
            TaskItemId = taskItemId,
            UserId = userId
        }, ct);

        if (start.Started)
        {
            _breakdownJobQueue.Enqueue(new BreakdownJobRequest(taskItemId, userId));
        }

        _logger.LogInformation("Breakdown start for task {TaskId}: started={Started}", taskItemId, start.Started);

        var status = await GetStatus(taskItemId, userId, ct);
        return Accepted(status);
    }

    [HttpGet("{taskItemId:int}/status")]
    public async Task<TaskBreakdownStatusDto> GetBreakdownStatus(int taskItemId, CancellationToken ct)
    {
        return await GetStatus(taskItemId, UserId, ct);
    }

    [HttpPost("{taskId}")]
    public async Task<BreakdownResult> BreakdownTask(string taskId, CancellationToken ct)
    {
        _logger.LogInformation("BreakdownTask called with taskId: {TaskId}", taskId);

        var userId = UserId;

        var command = new BreakdownTaskCommand
        {
            TaskId = int.Parse(taskId),
            UserId = userId
        };

        var result = await _breakdownTaskCommandHandler.Handle(command, ct);

        return result;
    }

    private async Task<TaskBreakdownStatusDto> GetStatus(int taskItemId, Guid userId, CancellationToken ct)
    {
        var status = await _getTaskBreakdownStatusQueryHandler.Handle(new GetTaskBreakdownStatusQuery
        {
            TaskItemId = taskItemId,
            UserId = userId
        }, ct);

        if (status.RetryAfterSeconds is { } seconds)
        {
            Response.Headers.RetryAfter = seconds.ToString();
        }

        return status;
    }
}

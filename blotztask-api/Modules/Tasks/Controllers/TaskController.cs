using System.Diagnostics;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class TaskController(
    GetTasksByDateQueryHandler getTasksByDateQueryHandler,
    TaskStatusUpdateCommandHandler taskStatusUpdateCommandHandler,
    AddTaskCommandHandler addTaskCommandHandler,
    GetTaskByIdQueryHandler getTaskByIdQueryHandler,
    GetFloatingTasksQueryHandler getFloatingTasksQueryHandler,
    DeleteTaskCommandHandler deleteTaskCommandHandler,
    EditTaskCommandHandler editTaskCommandHandler,
    GetAllTasksQueryHandler getAllTasksQueryHandler,
    GetFloatingTasksByQueryHandler getFloatingTasksByQueryHandler,
    ILogger<TaskController> logger
) : ControllerBase
{
    private readonly ILogger<TaskController> _logger = logger;

    [HttpGet("{id}")]
    public async Task<TaskByIdItemDto> GetTaskById(int id, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetTasksByIdQuery { TaskId = id, UserId = userId };
        return await getTaskByIdQueryHandler.Handle(query, ct);
    }

    [HttpGet("by-date")]
    public async Task<IEnumerable<TaskByDateItemDto>> GetTaskByDate(
        [FromQuery] GetTasksByDateRequest getTasksByDateRequest, CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();

        _logger.LogInformation("Resolving UserId from HttpContext for GetTaskByDate");
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        _logger.LogInformation(
            "Handling GetTaskByDate for user {UserId} starting at {StartDate} (IncludeFloatingForToday: {IncludeFloatingForToday})",
            userId,
            getTasksByDateRequest.StartDate,
            getTasksByDateRequest.IncludeFloatingForToday);

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDate = getTasksByDateRequest.StartDate,
            IncludeFloatingForToday = getTasksByDateRequest.IncludeFloatingForToday
        };

        var result = await getTasksByDateQueryHandler.Handle(query, ct);
        _logger.LogInformation(
            "GetTaskByDate finished for user {UserId}. Returned {TaskCount} tasks in {ElapsedMs}ms",
            userId,
            result.Count(),
            stopwatch.ElapsedMilliseconds);
        return result;
    }

    [HttpGet("floating")]
    public async Task<IEnumerable<FloatingTaskItemDto>> GetFloatingTasks(
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetFloatingTasksQuery
        {
            UserId = userId
        };

        var result = await getFloatingTasksQueryHandler.Handle(query, ct);
        return result;
    }

    [HttpGet("search")]
    public async Task<IEnumerable<FloatingTaskItemByQueryDto>> GetFloatingTasksByQuery([FromQuery] string query, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        if (string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        var searchQuery = new GetFloatingTasksByQuery
        {
            UserId = userId,
            Query = query
        };
        
        var result = await getFloatingTasksByQueryHandler.Handle(searchQuery, ct);
        return result;
    }

    [HttpGet("all")]
    public async Task<IEnumerable<AllTaskItemDto>> GetAllTasks(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetAllTasksQuery { UserId = userId };
        return await getAllTasksQueryHandler.Handle(query, ct);
    }

    [HttpPost]
    public async Task<int> AddTask([FromBody] AddTaskItemDto addtaskItem, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");


        var command = new AddTaskCommand
        {
            TaskDetails = addtaskItem,
            UserId = userId
        };

        var newTaskId = await addTaskCommandHandler.Handle(command, ct);
        return newTaskId;
    }

    [HttpPut("{id}")]
    public async Task<string> EditTask(int id, [FromBody] EditTaskItemDto editTaskItem, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new EditTaskCommand { TaskId = id, TaskDetails = editTaskItem, UserId = userId };

        return await editTaskCommandHandler.Handle(command, ct);
    }

    [HttpPut("task-completion-status/{id}")]
    public async Task<TaskStatusResultDto> TaskStatusUpdate(int id, CancellationToken ct)
    {
        var command = new TaskStatusUpdateCommand
        {
            TaskId = id
        };

        var result = await taskStatusUpdateCommandHandler.Handle(command, ct);

        if (result == null)
            throw new InvalidOperationException($"Task status update failed: no valid data returned for task ID {id}.");

        return result;
    }

    [HttpDelete("{id}")]
    public async Task<string> DeleteTaskById(int id)
    {
        var command = new DeleteTaskCommand { TaskId = id };

        return await deleteTaskCommandHandler.Handle(command);
    }
}

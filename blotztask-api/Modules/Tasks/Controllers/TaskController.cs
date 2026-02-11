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
    GetNoteFloatingTasksQueryHandler getNoteFloatingTasksQueryHandler,
    DeleteTaskCommandHandler deleteTaskCommandHandler,
    EditTaskCommandHandler editTaskCommandHandler,
    GetAllTasksQueryHandler getAllTasksQueryHandler,
    GetWeeklyTaskAvailabilityQueryHandler getWeeklyTaskAvailabilityQueryHandler,
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

    [HttpGet("note-floating-tasks")]
    public async Task<IEnumerable<FloatingTaskItemDto>> GetNoteFloatingTasks(
        [FromQuery] string? query, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var floatingTasksQuery = new GetNoteFloatingTasksQuery
        {
            UserId = userId,
            QueryString = query
        };

        var result = await getNoteFloatingTasksQueryHandler.Handle(floatingTasksQuery, ct);
        return result;
    }

    [HttpGet("weekly-task-availability")]
    public async Task<IEnumerable<DailyTaskIndicatorDto>> GetWeeklyTaskAvailability(
        [FromQuery] GetWeeklyTaskAvailabilityRequest getWeeklyTaskAvailabilityRequest,
        CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();

        _logger.LogInformation("Resolving UserId from HttpContext for GetWeeklyTaskAvailability");
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetWeeklyTaskAvailabilityQuery
        {
            UserId = userId,
            Monday = getWeeklyTaskAvailabilityRequest.Monday
        };

        _logger.LogInformation(
            "Timing GetWeeklyTaskAvailability for user {UserId} at Monday {Monday}; elapsed so far {ElapsedMs}ms",
            userId,
            getWeeklyTaskAvailabilityRequest.Monday,
            stopwatch.ElapsedMilliseconds);

        var result = await getWeeklyTaskAvailabilityQueryHandler.Handle(query, ct);
        _logger.LogInformation(
            "GetWeeklyTaskAvailability finished for user {UserId} in {ElapsedMs}ms",
            userId,
            stopwatch.ElapsedMilliseconds);
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

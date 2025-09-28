using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Modules.Tasks.Commands.Tasks;
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
    DeleteTaskCommandHandler deleteTaskCommandHandler,
    EditTaskCommandHandler editTaskCommandHandler
) : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<TaskByIdItemDto> GetTaskById(int id, CancellationToken ct)
    {
        var query = new GetTasksByIdQuery { TaskId = id };
        return await getTaskByIdQueryHandler.Handle(query, ct);
    }

    [HttpGet("by-date")]
    public async Task<IEnumerable<TaskByDateItemDto>> GetTaskByDate([FromQuery]GetTasksByDateRequest getTasksByDateRequest, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
        {
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        }
        
        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDateUtc = getTasksByDateRequest.StartDateUtc,
            IncludeFloatingForToday = getTasksByDateRequest.IncludeFloatingForToday
        };

        var result = await getTasksByDateQueryHandler.Handle(query, ct);
        return result;
    }

    [HttpPost]
    public async Task<string> AddTask([FromBody] AddTaskItemDto addtaskItem, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
        {
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        }

        var command = new AddTaskCommand
        {
            TaskDetails = addtaskItem,
            UserId = userId,
        };

        var result = await addTaskCommandHandler.Handle(command, ct);
        return result;
    }

    [HttpPut("{id}")]
    public async Task<string> EditTask(int id, [FromBody] EditTaskItemDto editTaskItem, CancellationToken ct)
    {
        var command = new EditTaskCommand { TaskId = id, TaskDetails = editTaskItem };

        return await editTaskCommandHandler.Handle(command, ct);
    }

    [HttpPut("task-completion-status/{id}")]
    public async Task<TaskStatusResultDto> TaskStatusUpdate(int id, CancellationToken ct)
    {
        var command = new TaskStatusUpdateCommand
        {
            TaskId = id,
        };

        var result = await taskStatusUpdateCommandHandler.Handle(command, ct);

        if (result == null)
        {
            throw new InvalidOperationException($"Task status update failed: no valid data returned for task ID {id}.");
        }

        return result;
    }

    [HttpDelete("{id}")]
    public async Task<string> DeleteTaskById(int id)
    {
        var command = new DeleteTaskCommand { TaskId = id };

        return await deleteTaskCommandHandler.Handle(command);
    }
}
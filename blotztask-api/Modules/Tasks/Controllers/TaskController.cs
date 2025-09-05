using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using BlotzTask.Modules.Tasks.DTOs;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class TaskController(
    ITaskService taskService,
    GetTasksByDateQueryHandler getTasksByDateQueryHandler,
    TaskStatusUpdateCommandHandler taskStatusUpdateCommandHandler,
    AddTaskCommandHandler addTaskCommandHandler,
    GetTaskByIdQueryHandler getTaskByIdQueryHandler
) : ControllerBase
{
    [HttpGet]
    [Obsolete("This endpoint is not in use and will be removed later.")]
    public async Task<ActionResult<List<TaskItemDto>>> GetAllTask(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            throw new UnauthorizedAccessException("Could not find user id from token");
        }

        return Ok(await taskService.GetTodoItemsByUser(userId, cancellationToken));
    }

    [HttpGet("monthly-stats/{year}-{month}")]
    [Obsolete("This endpoint is not in use and will be removed later.")]
    public async Task<IActionResult> GetMonthlyStats(int year, int month)
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }

        return Ok(await taskService.GetMonthlyStats(userId, year, month));
    }

    [HttpGet("{id}")]
    public async Task<TaskByIdItemDto> GetTaskById(int id, CancellationToken ct)
    {
        var query = new GetTasksByIdQuery { TaskId = id };
        return await getTaskByIdQueryHandler.Handle(query, ct);
    }

    [HttpGet("by-date")]
    public async Task<IEnumerable<TaskByDateItemDto>> GetTaskByDate([FromQuery] DateTime startDateUtc, [FromQuery] bool includeFloatingForToday, CancellationToken ct)
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }

        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDateUtc = startDateUtc,
            IncludeFloatingForToday = includeFloatingForToday
        };

        var result = await getTasksByDateQueryHandler.Handle(query, ct);
        return result;
    }

    [HttpGet("today-done")]
    [Obsolete("This endpoint is not in use in mobile app.")]
    public async Task<IActionResult> GetTodayDoneTasks()
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }

        return Ok(await taskService.GetTodayDoneTasks(userId));
    }

    [HttpPost]
    public async Task<string> AddTask([FromBody] AddTaskItemDto addtaskItem, CancellationToken ct)
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
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
    public async Task<IActionResult> EditTask(int id, [FromBody] EditTaskItemDto editTaskItem)
    {
        var result = await taskService.EditTaskAsync(id, editTaskItem);

        return Ok(result);
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
    public async Task<IActionResult> DeleteTaskById(int id)
    {
        var result = await taskService.DeleteTaskByIdAsync(id);

        return Ok(result);
    }

    [HttpPost("{id}/undo-delete")]
    [Obsolete("This endpoint is not in use in mobile app.")]
    public async Task<IActionResult> RestoreFromTrash(int id)
    {
        var result = await taskService.RestoreFromTrashAsync(id);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpGet("search")]
    [Obsolete("This endpoint is not in use in mobile app.")]
    public async Task<IActionResult> SearchTasks([FromQuery, Required] string query)
    {
        var tasks = await taskService.SearchTasksAsync(query);
        return Ok(tasks);
    }

    [HttpGet("scheduled-tasks")]
    [Obsolete("This endpoint is not in use in mobile app.")]
    public async Task<IActionResult> GetScheduleSortTasks([FromQuery, Required] string timeZone, [FromQuery, Required] DateTime todayDate)
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }

        return Ok(await taskService.GetScheduledTasks(timeZone, todayDate, userId));
    }

    [HttpGet("due-tasks")]
    [Obsolete("This endpoint is not in use in mobile app.")]
    public async Task<IActionResult> GetDueTasks()
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }

        var tasks = await taskService.GetDueTasksAsync(userId);

        return Ok(tasks);
    }
}
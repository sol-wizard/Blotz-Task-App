using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using BlotzTask.Modules.Tasks.DTOs;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Modules.Tasks.Services;
using BlotzTask.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class TaskController(ITaskService taskService, GetTasksByDateQueryHandler  getTasksByDateQueryHandler) : ControllerBase
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
    public async Task<IActionResult> GetTaskById(int id)
    {
        return Ok(await taskService.GetTaskById(id));
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
    public async Task<IActionResult> AddTask([FromBody] AddTaskItemDto addtaskItem)
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }
        return Ok(await taskService.AddTaskAsync(addtaskItem, userId));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> EditTask(int id, [FromBody] EditTaskItemDto editTaskItem)
    {
        var result = await taskService.EditTaskAsync(id, editTaskItem);

        return Ok(result);
    }

    [HttpPut("task-completion-status/{id}")]
    public async Task<IActionResult> TaskStatusUpdate(int id)
    {

        var taskStatusResultDto = await taskService.TaskStatusUpdate(id);

        if (taskStatusResultDto == null)
        {
            throw new InvalidOperationException($"Task status update failed: no valid data returned for task ID {id}.");
        }
        var message = taskStatusResultDto.Message;
        return Ok(new ResponseWrapper<int>(id, message, true));
    }


    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTaskById(int id)
    {
        var result = await taskService.DeleteTaskByIdAsync(id);

        return Ok(result);
    }

    [HttpPost("{id}/undo-delete")]
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
    public async Task<IActionResult> SearchTasks([FromQuery, Required] string query)
    {
        var tasks = await taskService.SearchTasksAsync(query);
        return Ok(tasks);
    }

    [HttpGet("scheduled-tasks")]
    [Obsolete("This endpoint not in used in mobile app.")]
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
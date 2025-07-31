using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using BlotzTask.Modules.Tasks.DTOs;
using BlotzTask.Modules.Tasks.Services;
using BlotzTask.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class TaskController : ControllerBase
{
    private readonly ITaskService _taskService;
    public TaskController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpGet]
    [Tags("MigratedToCleanArchitecture")]
    public async Task<ActionResult<List<TaskItemDto>>> GetAllTask(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        if (string.IsNullOrEmpty(userId))
        {
            throw new UnauthorizedAccessException("Could not find user id from token");
        }

        return Ok(await _taskService.GetTodoItemsByUser(userId, cancellationToken));
    }

    [HttpGet("monthly-stats/{year}-{month}")]
    [Obsolete("This endpoint is deprecated and will be removed later.")]
    public async Task<IActionResult> GetMonthlyStats(int year, int month)
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }

        return Ok(await _taskService.GetMonthlyStats(userId, year, month));
    }

    [HttpGet("{id}")]
    [Obsolete("This endpoint is not in use in frontend")]
    public async Task<IActionResult> GetTaskById(int id)
    {
        return Ok(await _taskService.GetTaskById(id));
    }
        
    //TODO: change the route "due-date" to "by-date"
    [HttpGet("due-date")]
    public async Task<IActionResult> GetTaskByDate([FromQuery] DateTime startDateUtc)
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }
            
        DateTime endDateUtc = startDateUtc.AddDays(1);
        return Ok(await _taskService.GetTaskByDate(startDateUtc, endDateUtc, userId));
    }

    [HttpGet("today-done")]
    public async Task<IActionResult> GetTodayDoneTasks()
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }

        return Ok(await _taskService.GetTodayDoneTasks(userId));
    }

    [HttpPost]
    [Tags("MigratedToCleanArchitecture")]
    public async Task<IActionResult> AddTask([FromBody] AddTaskItemDto addtaskItem)
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }
        return Ok(await _taskService.AddTaskAsync(addtaskItem, userId));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> EditTask(int id, [FromBody] EditTaskItemDto editTaskItem)
    {
        var result = await _taskService.EditTaskAsync(id, editTaskItem);

        return Ok(result);
    }

    [HttpPut("task-completion-status/{id}")]
    public async Task<IActionResult> TaskStatusUpdate(int id)
    {

        var taskStatusResultDto = await _taskService.TaskStatusUpdate(id);

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
        var result = await _taskService.DeleteTaskByIdAsync(id);

        return Ok(result);
    }

    [HttpPost("{id}/undo-delete")]
    public async Task<IActionResult> RestoreFromTrash(int id) 
    {
        var result = await _taskService.RestoreFromTrashAsync(id);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchTasks([FromQuery, Required] string query)
    {
        var tasks = await _taskService.SearchTasksAsync(query);
        return Ok(tasks);
    }

    [HttpGet("scheduled-tasks")]
    public async Task<IActionResult> GetScheduleSortTasks([FromQuery, Required] string timeZone, [FromQuery, Required] DateTime todayDate)
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }
            
        return Ok(await _taskService.GetScheduledTasks(timeZone, todayDate, userId));
    }

    [HttpGet("due-tasks")]
    public async Task<IActionResult> GetDueTasks()
    {
        var userId = HttpContext.Items["UserId"] as string;

        if (userId == null)
        {
            throw new UnauthorizedAccessException("Could not find user id from Http Context");
        }

        var tasks = await _taskService.GetDueTasksAsync(userId);

        return Ok(tasks);
    }
}
using System.ComponentModel.DataAnnotations;
using BlotzTask.Models;
using BlotzTask.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Controllers
{
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

        [HttpGet("alltask")]
        public async Task<IActionResult> GetAllTask()
        {
            var userId = HttpContext.Items["UserId"] as string;

            if (userId == null)
            {
                throw new UnauthorizedAccessException("Could not find user id from Http Context");
            }

            return Ok(await _taskService.GetTodoItemsByUser(userId));
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
        public async Task<IActionResult> GetTaskById(int id)
        {
            return Ok(await _taskService.GetTaskByID(id));
        }
        
        //TODO: change the route "due-date" to "by-date"
        [HttpGet("due-date")]
        public async Task<IActionResult> GetTaskByDate([FromQuery] DateTime startDateUTC)
        {
            var userId = HttpContext.Items["UserId"] as string;

            if (userId == null)
            {
                throw new UnauthorizedAccessException("Could not find user id from Http Context");
            }
            
            DateTime endDateUtc = startDateUTC.AddDays(1);
            return Ok(await _taskService.GetTaskByDate(startDateUTC, endDateUtc, userId));
        }


        [HttpPost]
        public async Task<IActionResult> AddTask([FromBody] AddTaskItemDTO addtaskItem)
        {
            var userId = HttpContext.Items["UserId"] as string;

            if (userId == null)
            {
                throw new UnauthorizedAccessException("Could not find user id from Http Context");
            }
            return Ok(await _taskService.AddTaskAsync(addtaskItem, userId));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> EditTask(int id, [FromBody] EditTaskItemDTO editTaskItem)
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
            var result = await _taskService.DeleteTaskByIDAsync(id);

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
    }
}

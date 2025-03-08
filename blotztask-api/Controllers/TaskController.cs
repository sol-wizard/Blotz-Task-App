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
        public async Task<IActionResult> GetTaskByID(int id)
        {
            return Ok(await _taskService.GetTaskByID(id));
        }

        [HttpGet("due-date")]
        public async Task<IActionResult> GetTaskByDate([FromQuery] string date, [FromQuery] string offset)
        {
            var userId = HttpContext.Items["UserId"] as string;

            if (userId == null)
            {
                throw new UnauthorizedAccessException("Could not find user id from Http Context");
            }

            if (!DateTime.TryParse(date, out DateTime localDate))
            {
                return BadRequest("Invalid date format");
            }

            if (!TimeSpan.TryParse(offset, out TimeSpan timeOffset))
            {
                return BadRequest("Invalid offset format");
            }

            var tasks = await _taskService.GetTaskByDate(localDate, timeOffset, userId);
            return Ok(tasks);
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

            try{
                var taskStatusResultDTO = await _taskService.TaskStatusUpdate(id);

                if (taskStatusResultDTO == null)
                {
                    throw new InvalidOperationException($"Task status update failed: no valid data returned for task ID {id}.");
                }
                

                var message = taskStatusResultDTO.Message;
                return Ok(new ResponseWrapper<int>(id, message, true));
            }catch(Exception){
                throw;
            }


        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTaskByID(int id)
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
    }
}

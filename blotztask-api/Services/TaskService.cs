using BlotzTask.Data;
using BlotzTask.Models;
using Microsoft.EntityFrameworkCore;
using BlotzTask.Data.Entities;
using BlotzTask.Models.CustomError;

namespace BlotzTask.Services;

public interface ITaskService
{
    public Task<List<TaskItemDTO>> GetTodoItemsByUser(string userId);
    public Task<TaskItemDTO> GetTaskByID(int Id);
    public Task<ResponseWrapper<int>> EditTaskAsync(int Id, EditTaskItemDTO editTaskItem);
    public Task<ResponseWrapper<int>> DeleteTaskByIDAsync(int Id);
    public Task<ResponseWrapper<string>> AddTaskAsync(AddTaskItemDTO addTaskItem, string userId);
    public Task<TaskStatusResultDTO> TaskStatusUpdate(int id, bool? isDone = null);
    public Task<List<TaskItemDTO>> GetTaskByDate(DateTime startDateUTC, DateTime endDateUTC, string userId);
    public Task<MonthlyStatDTO> GetMonthlyStats(string userId, int year, int month);
    public Task<ResponseWrapper<int>> RestoreFromTrashAsync(int id);
    public Task<List<TaskItemDTO>> SearchTasksAsync(string query);
    public Task<ScheduledTasksDTO> GetScheduledTasks(DateTime todayDate, string userId);
}

public class TaskService : ITaskService
{
    private readonly BlotzTaskDbContext _dbContext;

    public TaskService(BlotzTaskDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<TaskItemDTO>> GetTodoItemsByUser(string userId)
    {
        try
        {
            return await _dbContext.TaskItems
                .Where(x => x.UserId == userId)
                .Include(x => x.Label)
                .Select(x => new TaskItemDTO
                {
                    Id = x.Id,
                    Title = x.Title,
                    Description = x.Description,
                    DueDate = x.DueDate,
                    IsDone = x.IsDone,
                    Label = new LabelDTO { LabelId = x.Label.LabelId, Name = x.Label.Name, Color = x.Label.Color }        
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            //TODO: Add some error log throw 
            throw;
        }
    }
    public async Task<TaskItemDTO> GetTaskByID(int Id)
    {
        var task = await _dbContext.TaskItems.FindAsync(Id);

        if (task == null)
        {
            throw new NotFoundException($"Task with ID {Id} not found.");
        }

        var result = new TaskItemDTO()
        {
            Id = task.Id,
            Title = task.Title,
            Description = task.Description,
            DueDate = task.DueDate,
            IsDone = task.IsDone,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt,
            Label = new LabelDTO { Name = task.Label.Name, Color = task.Label.Color }
        };

        return result;
    }

    public async Task<ResponseWrapper<int>> DeleteTaskByIDAsync(int Id)
    {
        var taskItem = await _dbContext.TaskItems.FindAsync(Id);
        if (taskItem == null)
        {
            throw new NotFoundException($"Task with ID {Id} not found.");
        }
        var deletedTask = new DeletedTaskItem
        {
            Id = taskItem.Id,
            Title = taskItem.Title,
            Description = taskItem.Description,
            DueDate = taskItem.DueDate,
            IsDone = taskItem.IsDone,
            CreatedAt = taskItem.CreatedAt,
            UpdatedAt = taskItem.UpdatedAt,
            DeletedAt = DateTime.UtcNow, // Track when it was deleted
            UserId = taskItem.UserId,
            LabelId = taskItem.LabelId
        };
        try
        {
            _dbContext.DeletedTaskItems.Add(deletedTask);
            _dbContext.TaskItems.Remove(taskItem);
            await _dbContext.SaveChangesAsync();
            return new ResponseWrapper<int>(
                    taskItem.Id,
                    "Task deleted successfully.",
                    true
                );
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error deleting task: {ex.Message}");
            throw;
        }

       
    }

    public async Task<ResponseWrapper<string>> AddTaskAsync(AddTaskItemDTO addTaskItem, string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new UnauthorizedAccessException("User ID cannot be null or empty.");
        }

        try
        {
            var newTask = new TaskItem
            {
                Title = addTaskItem.Title,
                Description = addTaskItem.Description,
                DueDate = addTaskItem.DueDate,
                LabelId = addTaskItem.LabelId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _dbContext.TaskItems.Add(newTask);
            await _dbContext.SaveChangesAsync();

            return new ResponseWrapper<string>(
                newTask.Title,
                "Task added successfully.",
                true
            );
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error adding task: {ex.Message}");
            throw;
        }
    }

    

    public async Task<ResponseWrapper<int>> EditTaskAsync(int id, EditTaskItemDTO editTaskItem)
    {
        var task = await _dbContext.TaskItems.FindAsync(id);

        if (task == null)
        {
            throw new NotFoundException($"Task with ID {id} not found.");
        }

        try
        {
                       
            task.Title = editTaskItem.Title;
            task.Description = editTaskItem.Description;
            task.DueDate = editTaskItem.DueDate;
            task.UpdatedAt = DateTime.UtcNow;
            task.LabelId = editTaskItem.LabelId;
        
            
            _dbContext.TaskItems.Update(task);
            await _dbContext.SaveChangesAsync();

            return new ResponseWrapper<int>(
                    task.Id,
                    "Task edited successfully.",
                    true
                );
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error editing task: {ex.Message}");
            throw;
        }

        
    }

    public async Task<TaskStatusResultDTO> TaskStatusUpdate(int taskId, bool? isDone=null)
    {
        try{
            var task = await _dbContext.TaskItems.FindAsync(taskId);

            if (task == null)
            {
                throw new NotFoundException($"Task with ID {taskId} was not found.");
            }
            
            // If task.IsDone is null, set it to be false, otherwise, toggle the task.IsDone
            task.IsDone = isDone ?? !task.IsDone;

            task.UpdatedAt = DateTime.UtcNow;
            _dbContext.TaskItems.Update(task);
            await _dbContext.SaveChangesAsync();

            return new TaskStatusResultDTO{
                Id = task.Id,
                UpdatedAt = task.UpdatedAt,
                Message = task.IsDone ? "Task marked as completed." : "Task marked as incomplete."
            };
        }catch(Exception){
            throw;
        }
        
    }

    public async Task<List<TaskItemDTO>> GetTaskByDate(DateTime startDateUTC, DateTime endDateUTC, string userId)
    {
        try
        {
            return await _dbContext.TaskItems
                .Where(task => task.UserId == userId)
                .Where(task => task.DueDate >= startDateUTC && task.DueDate < endDateUTC)
                .Select(task => new TaskItemDTO
                {
                    Id = task.Id,
                    Title = task.Title,
                    Description = task.Description,
                    DueDate = task.DueDate,
                    IsDone = task.IsDone,
                    Label = new LabelDTO 
                    { 
                        LabelId = task.Label.LabelId, 
                        Name = task.Label.Name, 
                        Color = task.Label.Color 
                    }
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            throw new Exception($"Unhandled exception: {ex.Message}");
        }
    }

    public async Task<MonthlyStatDTO> GetMonthlyStats(string userId, int year, int month)
    {

        try
        {
            var filteredTasks = await _dbContext.TaskItems
                .Where(x => x.UserId == userId && x.DueDate.Month == month && x.DueDate.Year == year)
                .GroupBy(x => new { x.Label.Name, x.IsDone })
                .Select(g => new
                {
                    Label = g.Key.Name,
                    IsDone = g.Key.IsDone,
                    Count = g.Count()
                })
                .ToListAsync();

            var result = new MonthlyStatDTO(year, month);

            foreach (var task in filteredTasks)
            {
                if (task.IsDone)
                {
                    result.Tasks.Completed.Add(task.Label, task.Count);
                }
                else
                {
                    result.Tasks.Uncompleted.Add(task.Label, task.Count);
                }
            }
 
            return result;
        }
        catch (Exception ex)
        {
            throw;
        }
    }
    public async Task<ResponseWrapper<int>> RestoreFromTrashAsync(int id) {
        var deletedTask = await _dbContext.DeletedTaskItems.FindAsync(id);
        if (deletedTask == null) {
            throw new NotFoundException($"Deleted task with ID {id} not found.");
        }
        var restoredTask = new TaskItem
        {
            Title = deletedTask.Title,
            Description = deletedTask.Description,
            DueDate = deletedTask.DueDate,
            IsDone = deletedTask.IsDone,
            CreatedAt = deletedTask.CreatedAt,
            UpdatedAt = DateTime.UtcNow,
            UserId = deletedTask.UserId,
            LabelId = deletedTask.LabelId
        };
        try {
            _dbContext.TaskItems.Add(restoredTask);
            _dbContext.DeletedTaskItems.Remove(deletedTask);
            await _dbContext.SaveChangesAsync();
            return new ResponseWrapper<int>(
                deletedTask.Id,
                "Task recovered successfully.",
                true
            );
            
        } catch (Exception ex)
        {
            var innerExceptionMessage = ex.InnerException != null ? ex.InnerException.Message : "No inner exception.";
            return new ResponseWrapper<int>(
                0,
                $"Failed to recover task. Error: {ex.Message}. Inner Exception: {innerExceptionMessage}",
                false
            );
        }

    }

    public async Task<List<TaskItemDTO>> SearchTasksAsync(string query)
    {   
        try {
            return await _dbContext.TaskItems
            .Where(task => EF.Functions.Like(task.Title, $"%{query}%") || EF.Functions.Like(task.Description, $"%{query}%"))
            .Select(task => new TaskItemDTO{
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                DueDate = task.DueDate,
                IsDone = task.IsDone,
                Label = new LabelDTO 
                { 
                    LabelId = task.Label.LabelId, 
                    Name = task.Label.Name, 
                    Color = task.Label.Color 
                }
            })
            .ToListAsync();
        } catch (Exception ex)
        {
            throw new Exception($"Unhandled exception: {ex.Message}");
        }
    }

    public async Task<ScheduledTasksDTO> GetScheduledTasks(DateTime todayDate, string userId)
    {
        try {
            
            DateTime now = todayDate;

            var tasks = await _dbContext.TaskItems
            .Where(t => t.DueDate != null && t.DueDate.Month == now.Month)
            .Select(task => new TaskItemDTO{
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                DueDate = task.DueDate,
                IsDone = task.IsDone,
                Label = new LabelDTO 
                { 
                    LabelId = task.Label.LabelId, 
                    Name = task.Label.Name, 
                    Color = task.Label.Color 
                }
            })
            .OrderBy(t => t.DueDate)
            .ToListAsync();

            if (tasks is null)
            {
                return new ScheduledTasksDTO();
            }

            return GroupTasksBySchedule(tasks, now);

        } catch (Exception ex)
        {
            throw new Exception($"Unhandled exception: {ex.Message}");
        }
    }

    private ScheduledTasksDTO GroupTasksBySchedule(List<TaskItemDTO> tasks, DateTime now)
    {

        var today = now.Date;
        var tomorrow = today.AddDays(1);
        var startOfWeek = today.AddDays(-(int)today.DayOfWeek);
        var endOfWeek = startOfWeek.AddDays(6);

        var scheduledTasksDTO = new ScheduledTasksDTO
        {
            todayTasks = new List<TaskItemDTO>(),
            tomorrowTasks = new List<TaskItemDTO>(),
            weekTasks = new List<TaskItemDTO>(),
            monthTasks = new List<TaskItemDTO>()
        };

        foreach (var task in tasks)
        {
            var dueDate = task.DueDate.Date;

            if (dueDate == today)
            {
                scheduledTasksDTO.todayTasks.Add(task);
            }
            else if (dueDate == tomorrow)
            {
                scheduledTasksDTO.tomorrowTasks.Add(task);
            }
            else if (dueDate >= startOfWeek && dueDate <= endOfWeek)
            {
                scheduledTasksDTO.weekTasks.Add(task);
            }
            else
            {
                scheduledTasksDTO.monthTasks.Add(task);
            }
        }

        return scheduledTasksDTO;
    }
}


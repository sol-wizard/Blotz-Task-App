namespace BlotzTask.Modules.Tasks.DTOs;

public class ScheduledTasksDto
{
        
    public List<TaskItemDto> OverdueTasks { get; set; }
    public List<TaskItemDto> TodayTasks { get; set; }
    public List<TaskItemDto> TomorrowTasks { get; set; }
    public List<TaskItemDto> WeekTasks { get; set; }
    public List<TaskItemDto> FloatingTasks { get; set; }

    public Dictionary<int, List<TaskItemDto>> MonthTasks { get; set; }
}
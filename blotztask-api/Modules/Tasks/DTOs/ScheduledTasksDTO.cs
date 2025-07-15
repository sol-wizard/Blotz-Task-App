using System.Collections.Generic;

namespace BlotzTask.Models
{
    public class ScheduledTasksDTO
    {
        
        public List<TaskItemDTO> overdueTasks { get; set; }
        public List<TaskItemDTO> todayTasks { get; set; }
        public List<TaskItemDTO> tomorrowTasks { get; set; }
        public List<TaskItemDTO> weekTasks { get; set; }

        public Dictionary<int, List<TaskItemDTO>> monthTasks { get; set; }
    }


}
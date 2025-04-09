using System.Collections.Generic;

namespace BlotzTask.Models
{
    public class ScheduledTasksDTO
    {
        
        public List<TaskItemDTO> todayTasks { get; set; }
        public List<TaskItemDTO> tomorrowTasks { get; set; }
        public List<TaskItemDTO> weekTasks { get; set; }
        public List<TaskItemDTO> monthTasks { get; set; }
    }


}
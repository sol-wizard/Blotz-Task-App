using System.Collections.Generic;

namespace BlotzTask.Models
{
    public class ScheduleSortTasksDTO
    {
        
        public List<TaskItemDTO> todayTasks { get; set; }
        public List<TaskItemDTO> tomorrowTasks { get; set; }
        public List<TaskItemDTO> weekTasks { get; set; }
        public List<TaskItemDTO> monthTasks { get; set; }
    }


}
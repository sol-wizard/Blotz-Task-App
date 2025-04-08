import { TaskDetailDTO } from "./task-detail-dto";

export interface ScheduledTasksDTO {
  todayTasks: TaskDetailDTO[]; 
  tomorrowTasks: TaskDetailDTO[]; 
  weekTasks: TaskDetailDTO[]; 
  monthTasks: TaskDetailDTO[]; 
}
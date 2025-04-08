import { TaskDetailDTO } from "./task-detail-dto";

export interface ScheduleSortTasksDTO {
  todayTasks: TaskDetailDTO[]; 
  tomorrowTasks: TaskDetailDTO[]; 
  weekTasks: TaskDetailDTO[]; 
  monthTasks: TaskDetailDTO[]; 
}
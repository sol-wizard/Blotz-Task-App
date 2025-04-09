import { TaskDetailDTO } from "./task-detail-dto";

export interface ScheduledTasksDTO {
  overdueTasks: TaskDetailDTO[];
  todayTasks: TaskDetailDTO[]; 
  tomorrowTasks: TaskDetailDTO[]; 
  weekTasks: TaskDetailDTO[]; 
  monthsTasks: TaskDetailDTO[];
  groupByMonthTasks: Record<number, TaskDetailDTO[]>; 
}
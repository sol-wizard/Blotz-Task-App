import { TaskDetailDTO } from '../../../../model/task-detail-dto';

export interface ScheduledTasksDTO {
  overdueTasks: TaskDetailDTO[];
  todayTasks: TaskDetailDTO[];
  tomorrowTasks: TaskDetailDTO[];
  weekTasks: TaskDetailDTO[];
  monthTasks: Record<number, TaskDetailDTO[]>;
}

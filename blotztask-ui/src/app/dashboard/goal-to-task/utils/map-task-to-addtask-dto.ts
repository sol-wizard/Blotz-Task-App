import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { TaskDetailDTO2 } from '@/model/task-detail-dto-2';

export function mapTaskToAddTask(task: TaskDetailDTO2): RawAddTaskDTO {
  return {
    title: task.title,
    description: task.description,
    labelId: task.label.labelId,
    date: task.dueDate,
    time: undefined,
  };
}

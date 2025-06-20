import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { TaskDetailDTO } from '@/model/task-detail-dto';

export function mapTaskToAddTask(task: TaskDetailDTO): RawAddTaskDTO {
  return {
    title: task.title,
    description: task.description,
    labelId: task.label.labelId,
    date: task.dueDate,
    time: undefined,
  };
}

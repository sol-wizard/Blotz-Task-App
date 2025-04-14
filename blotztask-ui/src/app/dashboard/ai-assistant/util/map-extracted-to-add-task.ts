import { ExtractedTask } from '@/model/extracted-task-dto';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';

export function mapExtractedTaskToAddTaskDTO(task: ExtractedTask): RawAddTaskDTO {
  return {
    title: task.title,
    description: task.description ?? '',
    labelId: task.labelId ?? 6, // Default to 6 if labelId is not provided. Temporary solution until ai able to extract labelId
    date: new Date(task.due_date),
    time: undefined,
  };
}

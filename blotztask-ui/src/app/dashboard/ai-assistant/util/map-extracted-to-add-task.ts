import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { ExtractedTask } from '@/model/extracted-task-dto';

export function mapExtractedTaskToAddTaskDTO(task: ExtractedTask): AddTaskItemDTO {
  return {
    title: task.title,
    dueDate: task.due_date ?? null,
    description: task.description ?? '',
    labelId: task.labelId ?? 6, // Default to 6 if labelId is not provided. Temporary solution until ai able to extract labelId
  };
}
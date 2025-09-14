import { ExtractedTask } from '@/model/extracted-task-dto';
import { TaskDetailDTO } from '@/model/task-detail-dto';

export function mapExtractedToTaskDetail(extractedTask: ExtractedTask): TaskDetailDTO {
  console.log('in mapExtractedToTaskDetail', extractedTask);
  return {
    //TODO: This is just a temporary id, we not using id for now, just to fulfill the DTO, we will need new dto for it
    id: Date.now() + Math.floor(Math.random() * 10),
    description: extractedTask.description,
    title: extractedTask.title,
    isDone: false,
    label: extractedTask.label,
    endTime: new Date(extractedTask.endTime),
  };
}

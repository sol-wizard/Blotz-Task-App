import { ExtractedTask } from '@/model/extracted-task-dto';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import { v4 as uuidv4} from 'uuid';

export function mapExtractedToTaskDetail(extractedTask: ExtractedTask): TaskDetailDTO {
  return {
      id: Number(uuidv4()),
      description: extractedTask.description,
      title: extractedTask.title,
      isDone: false,
      label: extractedTask.label,
      dueDate: new Date(extractedTask.due_date),
      hasTime: false,
  };
}
import { ExtractedTask } from '@/model/extracted-task-dto';
import { TaskDetailDTO2 } from '@/model/task-detail-dto-2';
import { v4 as uuidv4} from 'uuid';

export function mapExtractedToTaskDetail(extractedTask: ExtractedTask): TaskDetailDTO2 {
  return {
      id: uuidv4(),
      description: extractedTask.description,
      title: extractedTask.title,
      isDone: false,
      label: extractedTask.label,
      dueDate: new Date(extractedTask.due_date),
      hasTime: false,
  };
}
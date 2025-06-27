import { ExtractedTask } from '@/model/extracted-task-dto';
import { TaskDetailDTO } from '@/model/task-detail-dto';

function generateRandomIntId(min = 1, max = 1000000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


export function mapExtractedToTaskDetail(extractedTask: ExtractedTask): TaskDetailDTO {
  return {
    //TODO: This id does NOT guarantee uniqueness across sessions or users.We will change the id to uuidv4 string later
      id: generateRandomIntId(),
      description: extractedTask.description,
      title: extractedTask.title,
      isDone: false,
      label: extractedTask.label,
      dueDate: new Date(extractedTask.due_date),
      hasTime: false,
  };
}
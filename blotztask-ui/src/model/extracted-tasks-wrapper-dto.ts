import { ExtractedTask } from "./extracted-task-dto";
import { TaskDetailDTO } from "./task-detail-dto";

//TODO: Rename this to return from AI service backend 
export interface ExtractedTasksWrapperDTO {
    message: string;
    tasks: ExtractedTask[];
  }

export interface AIAssistantResponse {
  message: string;
  tasks: TaskDetailDTO[];
}
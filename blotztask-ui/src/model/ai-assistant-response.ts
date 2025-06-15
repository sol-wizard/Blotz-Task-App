import { TaskDetailDTO } from "./task-detail-dto";

// Mapped frontend model
export interface AIAssistantResponse {
  message: string;
  tasks: TaskDetailDTO[];
}
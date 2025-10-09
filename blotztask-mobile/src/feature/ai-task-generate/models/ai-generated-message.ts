import { ExtractedTaskDTO } from "./extracted-task-dto";

export interface AiGeneratedMessageDTO {
  isSuccess: boolean;
  extractedTasks: ExtractedTaskDTO[];
  errorMessage?: string;
}

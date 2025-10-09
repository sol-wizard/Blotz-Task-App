import { ExtractedTaskDTO } from "./extracted-task-dto";

export interface AiResultMessageDTO {
  isSuccess: boolean;
  extractedTasks: ExtractedTaskDTO[];
  errorMessage?: string;
}

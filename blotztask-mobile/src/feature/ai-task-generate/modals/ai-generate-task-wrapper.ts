import { ExtractedTaskDTO } from "./extracted-task-dto";

export interface AiGeneratedTaskWrapperDTO {
  isSuccess: boolean;
  extractedTasks: ExtractedTaskDTO[];
  errorMessage?: string;
}

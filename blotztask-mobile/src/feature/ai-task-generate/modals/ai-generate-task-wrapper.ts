import { ExtractedTaskDTO } from "./extracted-task-dto";

export interface AiGeneratedTaskWrapperDTO {
  isSuccess: boolean;
  tasks: ExtractedTaskDTO[];
  errorMessage?: string;
}

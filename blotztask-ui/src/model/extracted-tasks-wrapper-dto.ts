import { ExtractedTask } from "./extracted-task-dto";

export interface ExtractedTasksWrapperDTO {
    message: string;
    tasks: ExtractedTask[];
  }
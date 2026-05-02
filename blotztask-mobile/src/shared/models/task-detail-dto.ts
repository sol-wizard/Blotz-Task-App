import { LabelDTO } from "./label-dto";
import { SubtaskDTO } from "../../feature/task-details/models/subtask-dto";
import { BaseTaskDTO } from "./base-task-dto";

export interface TaskDetailDTO extends BaseTaskDTO {
  id: number | null;
  recurringTaskId?: number | null;
  isDone: boolean;
  label?: LabelDTO;
  subtasks?: SubtaskDTO[];
}

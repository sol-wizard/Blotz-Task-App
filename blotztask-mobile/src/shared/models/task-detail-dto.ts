import { LabelDTO } from "./label-dto";
import { SubtaskDTO } from "../../feature/task-details/models/subtask-dto";

export enum TaskTimeType {
  Single = 0,
  Range = 1,
}

export interface TaskDetailDTO {
  id: number | null;
  recurringTaskId?: number | null;
  description?: string;
  title: string;
  isDone: boolean;
  label?: LabelDTO;
  startTime: string;
  endTime: string;
  timeType: TaskTimeType | null;
  notificationId: string | null;
  subtasks?: SubtaskDTO[];
  alertTime?: string;
  isDdl: boolean;
}

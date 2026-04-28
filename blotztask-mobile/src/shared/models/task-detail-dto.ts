import { LabelDTO } from "./label-dto";
import { SubtaskDTO } from "../../feature/task-details/models/subtask-dto";

export enum TaskTimeType {
  Single = 0,
  Range = 1,
}

export interface BasicTaskFields {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  timeType: TaskTimeType | null;
  notificationId: string | null;
  alertTime?: string;
  isDeadline: boolean;
}

export interface TaskDetailDTO extends BasicTaskFields {
  id: number | null;
  recurringTaskId?: number | null;
  isDone: boolean;
  label?: LabelDTO;
  subtasks?: SubtaskDTO[];
}

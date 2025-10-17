import { TaskStatusType } from "./task-status-type";

export interface TaskStatusSelectItem {
  id: TaskStatusType;
  status: string;
  count: number;
}

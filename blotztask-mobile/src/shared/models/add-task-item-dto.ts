import { TimedTaskFields } from "./task-detail-dto";

export interface AddTaskItemDTO extends TimedTaskFields {
  labelId?: number;
  dueAt?: string;
}

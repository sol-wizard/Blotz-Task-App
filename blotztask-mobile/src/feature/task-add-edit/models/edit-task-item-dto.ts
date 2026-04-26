import { TimedTaskFields } from "@/shared/models/task-detail-dto";

export interface EditTaskItemDTO extends TimedTaskFields {
  labelId?: number;
  dueAt?: string;
}

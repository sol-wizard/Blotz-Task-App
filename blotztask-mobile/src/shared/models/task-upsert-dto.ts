import { TimedTaskFields } from "./task-detail-dto";

export interface TaskUpsertDTO extends TimedTaskFields {
  labelId?: number;
  dueAt?: string;
}

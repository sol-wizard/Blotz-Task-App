import { BasicTaskFields } from "./task-detail-dto";

export interface TaskUpsertDTO extends BasicTaskFields {
  labelId?: number;
  dueAt?: string;
}

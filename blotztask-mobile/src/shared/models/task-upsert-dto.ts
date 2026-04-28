import { BaseTask } from "./task-detail-dto";

export interface TaskUpsertDTO extends BaseTask {
  labelId?: number;
  dueAt?: string;
}

import { BaseTaskDTO } from "./base-task-dto";

export interface TaskUpsertDTO extends BaseTaskDTO {
  labelId?: number;
  dueAt?: string;
}

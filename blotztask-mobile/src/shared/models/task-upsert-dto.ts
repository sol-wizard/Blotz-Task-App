import { BaseTaskDTO } from "./base-task-dto";

export type TaskRecurrence = "never" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | "custom";

export interface TaskUpsertDTO extends BaseTaskDTO {
  labelId?: number;
  recurrence?: TaskRecurrence;
}

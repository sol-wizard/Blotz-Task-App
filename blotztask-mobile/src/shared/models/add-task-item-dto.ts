import { TaskTimeType } from "@/feature/task-add-edit/util/time-type-mapper";

export interface AddTaskItemDTO {
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  labelId?: number;
  timeType?: TaskTimeType;
}

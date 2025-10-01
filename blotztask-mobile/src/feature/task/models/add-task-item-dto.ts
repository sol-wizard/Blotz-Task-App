import { TaskTimeType } from "../../task-add-edit/util/time-type-mapper";

export interface AddTaskItemDTO {
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  timeType: number;
  labelId: number;
  timeType?: TaskTimeType;
}

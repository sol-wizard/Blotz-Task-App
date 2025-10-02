import { TaskTimeType } from "../util/time-type-mapper";

export interface EditTaskItemDTO {
  id: number;
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  labelId?: number;
  timeType?: TaskTimeType;
}

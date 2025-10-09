import { TaskTimeType } from "@/shared/models/task-detail-dto";

export interface EditTaskItemDTO {
  id: number;
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  labelId?: number;
  timeType?: TaskTimeType;
}

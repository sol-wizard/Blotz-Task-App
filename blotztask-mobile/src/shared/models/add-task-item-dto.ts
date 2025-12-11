import { TaskTimeType } from "./task-detail-dto";

export interface AddTaskItemDTO {
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  labelId?: number;
  timeType: TaskTimeType | null;
  notificationId: string | null;
}

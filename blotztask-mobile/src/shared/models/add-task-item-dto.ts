import { TaskTimeType } from "./task-detail-dto";

export interface AddTaskItemDTO {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  labelId?: number;
  timeType: TaskTimeType | null;
  notificationId?: string | null;
  alertTime?: string;
}

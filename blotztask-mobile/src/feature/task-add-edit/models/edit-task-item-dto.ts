import { TaskTimeType } from "@/shared/models/task-detail-dto";

export interface EditTaskItemDTO {
  id: number;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  labelId?: number;
  timeType: TaskTimeType | null;
  notificationId?: string | null;
  alertTime?: string;
}

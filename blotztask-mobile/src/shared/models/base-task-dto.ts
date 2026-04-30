export enum TaskTimeType {
  Single = 0,
  Range = 1,
}

export interface BaseTaskDTO {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  timeType: TaskTimeType | null;
  notificationId: string | null;
  alertTime?: string;
  isDeadline: boolean;
}

export enum TaskTimeType {
  Single = "SingleTime",
  Range = "RangeTime",
}

export interface BaseTaskDTO {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  timeType: TaskTimeType;
  notificationId: string | null;
  alertTime?: string;
  isDeadline: boolean;
}

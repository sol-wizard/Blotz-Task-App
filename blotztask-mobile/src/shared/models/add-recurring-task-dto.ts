import { TaskTimeType } from "./task-detail-dto";

export enum RecurrenceFrequency {
  Daily = 0,
  Weekly = 1,
  Monthly = 2,
  Yearly = 3,
}

export interface AddRecurringTaskDTO {
  title: string;
  description?: string;
  timeType: TaskTimeType;
  labelId?: number;
  templateStartTime: string;
  templateEndTime?: string;
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
}

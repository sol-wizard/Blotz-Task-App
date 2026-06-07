import { TaskTimeType } from "./base-task-dto";

export type RecurrenceFrequency = "Daily" | "Weekly" | "Monthly" | "Yearly";

export interface RecurringTaskCreateDTO {
  title: string;
  description?: string;
  timeType: TaskTimeType;
  labelId?: number;
  templateStartTime: string;
  templateEndTime?: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number | null;
  dayOfMonth?: number | null;
  startDate: string;
  endDate?: string | null;
  isDeadline?: boolean;
  templateDueAt?: string | null;
  deadlineTimeZoneId?: string | null;
}

export interface CreateRecurringTaskResultDTO {
  seriesId: number;
  recurringTaskId: number;
}

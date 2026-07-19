import { LabelDTO } from "@/shared/models/label-dto";
import { TaskTimeType } from "@/shared/models/base-task-dto";
import { RecurrenceFrequency } from "@/shared/models/recurring-task-create-dto";

// Display + save carrier for an AI-extracted recurring draft. Parallel to AiTaskDTO — carries the
// resolved label + a human-readable schedule summary for the card, and the recurrence fields
// needed to build a RecurringTaskCreateDTO on confirm.
export interface AiRecurringTaskDTO {
  id: string;
  title: string;
  description: string;
  label?: LabelDTO;
  timeType: TaskTimeType;
  templateStartTime: string;
  templateEndTime: string;
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number | null;
  dayOfMonth?: number | null;
  startDate: string;
  endDate?: string | null;
  scheduleSummary: string;
}

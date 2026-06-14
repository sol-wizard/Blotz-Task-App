import { LabelDTO } from "./label-dto";
import { SubtaskDTO } from "../../feature/task-details/models/subtask-dto";
import { BaseTaskDTO } from "./base-task-dto";
import { RecurrenceFrequency } from "./recurring-task-create-dto";

export const TASK_OCCURRENCE_KIND = {
  NormalTaskItem: "NormalTaskItem",
  MaterializedRecurringOccurrence: "MaterializedRecurringOccurrence",
  VirtualRecurringOccurrence: "VirtualRecurringOccurrence",
} as const;

export type TaskOccurrenceKind =
  (typeof TASK_OCCURRENCE_KIND)[keyof typeof TASK_OCCURRENCE_KIND];

export type RecurringOccurrenceIdentityDTO = {
  recurringTaskId: number;
  occurrenceDate: string;
};

export type RecurringTaskEditMetadataDTO = {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number | null;
  dayOfMonth?: number | null;
  startDate: string;
  endDate?: string | null;
};

export interface TaskDetailDTO extends BaseTaskDTO {
  id: number | null;
  occurrenceKind?: TaskOccurrenceKind;
  recurringOccurrence?: RecurringOccurrenceIdentityDTO | null;
  recurringTask?: RecurringTaskEditMetadataDTO | null;
  isDone: boolean;
  label?: LabelDTO;
  subtasks?: SubtaskDTO[];
}

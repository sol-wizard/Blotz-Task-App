import { LabelDTO } from "./label-dto";
import { SubtaskDTO } from "../../feature/task-details/models/subtask-dto";
import { BaseTaskDTO } from "./base-task-dto";

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

export interface TaskDetailDTO extends BaseTaskDTO {
  id: number | null;
  occurrenceKind?: TaskOccurrenceKind;
  recurringOccurrence?: RecurringOccurrenceIdentityDTO | null;
  isDone: boolean;
  label?: LabelDTO;
  subtasks?: SubtaskDTO[];
}

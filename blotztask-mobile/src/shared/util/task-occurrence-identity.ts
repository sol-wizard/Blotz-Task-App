import {
  RecurringOccurrenceIdentityDTO,
  TASK_OCCURRENCE_KIND,
  TaskDetailDTO,
} from "@/shared/models/task-detail-dto";

export function hasTaskItemId(task: TaskDetailDTO): task is TaskDetailDTO & { id: number } {
  return task.id != null;
}

export function isVirtualRecurringOccurrence(task: TaskDetailDTO): boolean {
  return task.occurrenceKind === TASK_OCCURRENCE_KIND.VirtualRecurringOccurrence;
}

export function getRecurringOccurrenceIdentity(
  task: TaskDetailDTO,
): RecurringOccurrenceIdentityDTO | null {
  return task.recurringOccurrence ?? null;
}

export function getRecurringOccurrenceDate(task: TaskDetailDTO): string | null {
  return getRecurringOccurrenceIdentity(task)?.occurrenceDate ?? null;
}

export function getRecurringTaskId(task: TaskDetailDTO): number | null {
  return getRecurringOccurrenceIdentity(task)?.recurringTaskId ?? null;
}

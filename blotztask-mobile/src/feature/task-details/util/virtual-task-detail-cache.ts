import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { getRecurringTaskId } from "@/shared/util/task-occurrence-identity";

export const virtualTaskDetailKeys = {
  byKey: (key: string) => ["virtualTaskDetail", key] as const,
} as const;

export function createVirtualTaskDetailCacheKey(task: TaskDetailDTO, occurrenceDate: string) {
  const recurringTaskId = getRecurringTaskId(task);
  if (recurringTaskId == null) {
    throw new Error("Recurring task id is required for a virtual task detail cache key.");
  }

  return `${recurringTaskId}:${occurrenceDate}`;
}

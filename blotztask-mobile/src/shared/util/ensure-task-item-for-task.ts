import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import {
  getRecurringOccurrenceDate,
  getRecurringTaskId,
  hasTaskItemId,
} from "@/shared/util/task-occurrence-identity";

type RecurringOccurrencePayload = {
  recurringTaskId: number;
  occurrenceDate: string;
  invalidateOnSuccess?: boolean;
};

type RecurringOccurrenceResult = {
  taskItemId: number;
};

type EnsureTaskItemForTaskParams = {
  task: TaskDetailDTO;
  materializeOccurrence: (
    payload: RecurringOccurrencePayload,
  ) => Promise<RecurringOccurrenceResult>;
  invalidateOnMaterializeSuccess?: boolean;
};

export async function ensureTaskItemForTask({
  task,
  materializeOccurrence,
  invalidateOnMaterializeSuccess = true,
}: EnsureTaskItemForTaskParams): Promise<number> {
  if (hasTaskItemId(task)) {
    return task.id;
  }

  const recurringTaskId = getRecurringTaskId(task);
  if (recurringTaskId == null) {
    throw new Error("Recurring task id is required to materialize a recurring occurrence.");
  }

  const occurrenceDate = getRecurringOccurrenceDate(task);
  if (!occurrenceDate) {
    throw new Error("Occurrence date is required to materialize a recurring occurrence.");
  }

  const result = await materializeOccurrence({
    recurringTaskId,
    occurrenceDate,
    invalidateOnSuccess: invalidateOnMaterializeSuccess,
  });

  return result.taskItemId;
}

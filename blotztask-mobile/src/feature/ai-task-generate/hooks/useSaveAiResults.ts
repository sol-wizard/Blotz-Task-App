import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import type { TaskSource } from "@/shared/constants/posthog-events";
import { analytics } from "@/shared/services/analytics";
import { AiTaskDTO } from "../models/ai-task-dto";
import { AiRecurringTaskDTO } from "../models/ai-recurring-task-dto";
import { AiNoteDTO } from "../models/ai-result-message-dto";
import { convertAiTaskToTaskUpsertDTO } from "../utils/map-aitask-to-addtaskitem-dto";
import { mapRecurringToCreateDTO } from "../utils/map-recurring-to-create-dto";

type AiDrafts = {
  tasks: AiTaskDTO[];
  recurringTasks: AiRecurringTaskDTO[];
  notes: AiNoteDTO[];
};

/** Saves the drafts the AI produced. `source` is what `task_created` reports for them. */
export function useSaveAiResults(source: Exclude<TaskSource, "manual">) {
  const { addTaskAsync, isAdding, createRecurringTaskAsync, isCreatingRecurringTask } =
    useTaskMutations();
  const { createNoteAsync, isNoteCreating } = useNotesMutation();
  const isSaving = isAdding || isNoteCreating || isCreatingRecurringTask;

  /** Resolves true only when every draft was saved. */
  const saveAll = async ({ tasks, recurringTasks, notes }: AiDrafts): Promise<boolean> => {
    if (isSaving) return false;

    const results = await Promise.allSettled([
      ...tasks.map(async (task) => {
        // Fire per successful task, not behind the all-succeed gate below, so a partial
        // failure still records the tasks that did land.
        const taskId = await addTaskAsync(convertAiTaskToTaskUpsertDTO(task));
        analytics.trackTaskCreated({
          taskId,
          source,
          isRecurring: false,
          hasDeadline: false,
        });
      }),
      ...recurringTasks.map(async (task) => {
        const { recurringTaskId } = await createRecurringTaskAsync(mapRecurringToCreateDTO(task));
        analytics.trackTaskCreated({
          taskId: recurringTaskId,
          source,
          isRecurring: true,
          hasDeadline: false,
        });
      }),
      ...notes.map((n) => createNoteAsync({ text: n.text, isPersistent: false })),
    ]);

    // Failed mutations are already handled by the global mutationCache.onError (toast + Sentry).
    const allSucceeded = results.every((r) => r.status === "fulfilled");
    if (allSucceeded) {
      notes.forEach(() => analytics.trackNoteCreated({ source: "ai" }));
    }
    return allSucceeded;
  };

  return { saveAll, isSaving };
}

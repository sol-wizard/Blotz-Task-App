import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePin, deleteDeadlineTask } from "../services/ddl-services";
import {
  materializeRecurringOccurrence,
  saveRecurringOccurrence,
  toggleTaskCompletion,
} from "@/shared/services/task-service";
import { ddlKeys, taskKeys } from "@/shared/constants/query-key-factory";
import { DeadlineTaskDTO } from "../models/deadline-task-dto";
import { useFirework } from "@/feature/firework-animation/hooks/useFirework";

type UpdatePinArgs = {
  task: DeadlineTaskDTO;
  isPinned: boolean;
};

const useDdlMutation = () => {
  const queryClient = useQueryClient();
  const { task: taskFirework } = useFirework();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ddlKeys.all });
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
  };

  const updatePinMutation = useMutation({
    mutationFn: async ({ task, isPinned }: UpdatePinArgs) => {
      const taskId = await ensureDeadlineTaskId(task);
      await updatePin(taskId, isPinned);
    },
    onSettled: () => {
      invalidateAll();
    },
  });

  const deleteDeadlineTaskMutation = useMutation({
    mutationFn: (task: DeadlineTaskDTO) => {
      if (task.id == null) {
        return Promise.resolve();
      }

      return deleteDeadlineTask(task.id);
    },
    onSettled: () => {
      invalidateAll();
    },
  });

  const markAsDoneMutation = useMutation({
    mutationFn: async (task: DeadlineTaskDTO) => {
      if (task.id != null) {
        await toggleTaskCompletion(task.id);
        return;
      }

      const recurringOccurrence = task.recurringOccurrence;
      if (!recurringOccurrence) return;

      await saveRecurringOccurrence({
        recurringTaskId: recurringOccurrence.recurringTaskId,
        occurrenceDate: recurringOccurrence.occurrenceDate,
      });
    },
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ddlKeys.all });
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousDdlTasks = queryClient.getQueryData<DeadlineTaskDTO[]>(ddlKeys.all);

      if (previousDdlTasks) {
        queryClient.setQueryData<DeadlineTaskDTO[]>(ddlKeys.all, (old) =>
          old?.map((t) =>
            isSameDeadlineTask(t, task) ? { ...t, isDone: !t.isDone } : t,
          ),
        );
      }

      return { previousDdlTasks };
    },

    onSuccess: (_data, task) => {
      taskFirework.playIfCompleting(task.isDone);
    },

    onSettled: () => {
      invalidateAll();
    },
  });

  return {
    updatePin: updatePinMutation.mutate,
    isUpdatingPin: updatePinMutation.isPending,
    deleteDeadlineTask: deleteDeadlineTaskMutation.mutate,
    isDeletingDeadlineTask: deleteDeadlineTaskMutation.isPending,
    markAsDone: markAsDoneMutation.mutate,
    isMarkingAsDone: markAsDoneMutation.isPending,
  };
};

export default useDdlMutation;

async function ensureDeadlineTaskId(task: DeadlineTaskDTO): Promise<number> {
  if (task.id != null) {
    return task.id;
  }

  const recurringOccurrence = task.recurringOccurrence;
  if (!recurringOccurrence) {
    throw new Error("Recurring occurrence identity is required.");
  }

  const result = await materializeRecurringOccurrence({
    recurringTaskId: recurringOccurrence.recurringTaskId,
    occurrenceDate: recurringOccurrence.occurrenceDate,
  });

  return result.taskItemId;
}

function isSameDeadlineTask(left: DeadlineTaskDTO, right: DeadlineTaskDTO): boolean {
  if (left.id != null && right.id != null) {
    return left.id === right.id;
  }

  return (
    left.recurringOccurrence?.recurringTaskId === right.recurringOccurrence?.recurringTaskId &&
    left.recurringOccurrence?.occurrenceDate === right.recurringOccurrence?.occurrenceDate
  );
}

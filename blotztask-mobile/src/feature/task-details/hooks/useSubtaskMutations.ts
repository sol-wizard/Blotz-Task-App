import {
  replaceSubtasks as replaceSubtasksService,
  createBreakDownSubtasks,
  deleteSubtask,
  updateSubtask,
  toggleSubtaskStatus,
  addSubtask,
} from "@/feature/task-details/services/subtask-service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subtaskKeys, taskKeys } from "@/shared/constants/query-key-factory";
import { BreakdownResultDTO } from "../models/breakdown-result-dto";
import { analytics } from "@/shared/services/analytics";
import { useSubtaskFirework } from "@/feature/firework-animation/hooks/useSubtaskFirework";

type ToggleSubtaskStatusVariables = {
  subtaskId: number;
  parentTaskId: number;
  wasDone: boolean;
};

export const useSubtaskMutations = () => {
  const queryClient = useQueryClient();
  const { playSubtaskFirework } = useSubtaskFirework();

  const breakDownAndReplaceSubtasksMutation = useMutation<
    BreakdownResultDTO | undefined,
    Error,
    number
  >({
    mutationFn: async (taskId: number) => {
      const startTime = Date.now();
      let result: BreakdownResultDTO | undefined;

      try {
        result = await createBreakDownSubtasks(taskId);
        if (result?.isSuccess && result.subtasks?.length) {
          await replaceSubtasksService({
            taskId,
            subtasks: result.subtasks.map((subtask) => ({ ...subtask })),
          });
        }

        return result;
      } finally {
        analytics.trackTaskBreakdown({
          success: result?.isSuccess ?? false,
          durationMs: Date.now() - startTime,
          generatedSubtaskCount: result?.subtasks?.length ?? 0,
        });
      }
    },
    onSuccess: async (_, taskId) => {
      await queryClient.invalidateQueries({ queryKey: subtaskKeys.all(taskId) });
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, parentTaskId }: { subtaskId: number; parentTaskId: number }) =>
      deleteSubtask(subtaskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: subtaskKeys.all(variables.parentTaskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: updateSubtask,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: subtaskKeys.all(variables.parentTaskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });

  const addSubtaskMutation = useMutation({
    mutationFn: addSubtask,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: subtaskKeys.all(variables.parentTaskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });

  const toggleSubtaskStatusMutation = useMutation({
    mutationFn: ({ subtaskId }: ToggleSubtaskStatusVariables) => toggleSubtaskStatus(subtaskId),
    onMutate: (variables) => {
      if (!variables.wasDone) {
        playSubtaskFirework();
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: subtaskKeys.all(variables.parentTaskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });

  return {
    // Breakdown
    breakDownAndReplaceSubtasks: breakDownAndReplaceSubtasksMutation.mutateAsync,
    isBreakingDownAndReplacingSubtasks: breakDownAndReplaceSubtasksMutation.isPending,

    // Delete subtask
    deleteSubtask: deleteSubtaskMutation.mutate,
    isDeletingSubtask: deleteSubtaskMutation.isPending,

    // Update subtask
    updateSubtask: updateSubtaskMutation.mutate,
    isUpdatingSubtask: updateSubtaskMutation.isPending,

    // Add subtask
    addSubtask: addSubtaskMutation.mutate,
    isAddingSubtask: addSubtaskMutation.isPending,

    // Toggle subtask status
    toggleSubtaskStatus: toggleSubtaskStatusMutation.mutate,
    isTogglingSubtaskStatus: toggleSubtaskStatusMutation.isPending,
  };
};

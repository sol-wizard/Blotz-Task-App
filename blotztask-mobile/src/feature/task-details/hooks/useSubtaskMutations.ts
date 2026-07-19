import {
  breakDownAndReplaceTaskSubtasks,
  BreakdownTaskTarget,
  deleteSubtask,
  updateSubtask,
  toggleSubtaskStatus,
  addSubtask,
} from "@/feature/task-details/services/subtask-service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subtaskKeys, taskKeys } from "@/shared/constants/query-key-factory";
import { BreakdownAndReplaceTaskResultDTO } from "../models/breakdown-result-dto";
import { analytics } from "@/shared/services/analytics";
import { useFirework } from "@/feature/firework-animation/hooks/useFirework";

type ToggleSubtaskStatusVariables = {
  subtaskId: number;
  parentTaskId: number;
  wasDone: boolean;
};

export const useSubtaskMutations = () => {
  const queryClient = useQueryClient();
  const { subtask: subtaskFirework } = useFirework();

  const breakDownAndReplaceSubtasksMutation = useMutation<
    BreakdownAndReplaceTaskResultDTO | undefined,
    Error,
    BreakdownTaskTarget
  >({
    mutationFn: async (target: BreakdownTaskTarget) => {
      const startTime = Date.now();
      let result: BreakdownAndReplaceTaskResultDTO | undefined;

      try {
        result = await breakDownAndReplaceTaskSubtasks(target);
        return result;
      } finally {
        analytics.trackTaskBreakdown({
          success: result?.isSuccess ?? false,
          durationMs: Date.now() - startTime,
          generatedSubtaskCount: result?.subtasks?.length ?? 0,
        });
      }
    },
    onSuccess: async (result) => {
      if (result) {
        await queryClient.invalidateQueries({ queryKey: subtaskKeys.all(result.taskItemId) });
      }
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
    onSuccess: (_, variables) => {
      subtaskFirework.playIfCompleting(variables.wasDone);
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

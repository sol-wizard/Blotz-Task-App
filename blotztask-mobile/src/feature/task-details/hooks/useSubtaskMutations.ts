import {
  replaceSubtasks as replaceSubtasksService,
  createBreakDownSubtasks,
  deleteSubtask,
  updateSubtask,
  toggleSubtaskStatus,
} from "@/feature/task-details/services/subtask-service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subtaskKeys, taskKeys } from "@/shared/constants/query-key-factory";
import { BreakdownResultDTO } from "../models/breakdown-result-dto";
import { analytics } from "@/shared/services/analytics";

export const useSubtaskMutations = () => {
  const queryClient = useQueryClient();

  const breakdownMutation = useMutation<BreakdownResultDTO | undefined, void, number>({
    mutationFn: createBreakDownSubtasks,
    onError: (error) => {
      console.error("Failed to create subtasks:", error);
    },
  });

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

        if (!result || result.isSuccess === false) {
          return result;
        }

        const subtasks = result.subtasks ?? [];
        if (subtasks.length > 0) {
          await replaceSubtasksService({
            taskId,
            subtasks: subtasks.map((subtask) => ({ ...subtask })),
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
    onSuccess: async (result, taskId) => {
      if (!result || result.isSuccess === false || (result.subtasks?.length ?? 0) === 0) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: subtaskKeys.all(taskId) });
      await queryClient.refetchQueries({
        queryKey: subtaskKeys.all(taskId),
        exact: true,
      });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (error) => {
      console.error("Failed to break down and replace subtasks:", error);
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, parentTaskId }: { subtaskId: number; parentTaskId: number }) =>
      deleteSubtask(subtaskId),
    onSuccess: (_, variables) => {
      console.log("Deleted subtask", variables.subtaskId);
      queryClient.invalidateQueries({ queryKey: subtaskKeys.all(variables.parentTaskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (error) => {
      console.error("Failed to delete subtask:", error);
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: updateSubtask,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to update subtask:", error);
    },
  });

  const toggleSubtaskStatusMutation = useMutation({
    mutationFn: ({ subtaskId }: { subtaskId: number; parentTaskId: number }) =>
      toggleSubtaskStatus(subtaskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to toggle subtask status:", error);
    },
  });

  return {
    // Breakdown
    breakDownTask: breakdownMutation.mutateAsync,
    isBreakingDown: breakdownMutation.isPending,

    breakDownAndReplaceSubtasks: breakDownAndReplaceSubtasksMutation.mutateAsync,
    isBreakingDownAndReplacingSubtasks: breakDownAndReplaceSubtasksMutation.isPending,

    // Delete subtask
    deleteSubtask: deleteSubtaskMutation.mutateAsync,
    isDeletingSubtask: deleteSubtaskMutation.isPending,

    //Update subtask
    updateSubtask: updateSubtaskMutation.mutateAsync,
    isUpdatingSubtask: updateSubtaskMutation.isPending,

    // Toggle subtask status
    toggleSubtaskStatus: toggleSubtaskStatusMutation.mutateAsync,
    isTogglingSubtaskStatus: toggleSubtaskStatusMutation.isPending,
  };
};

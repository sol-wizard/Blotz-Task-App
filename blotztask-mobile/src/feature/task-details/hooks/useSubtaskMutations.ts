import {
  replaceSubtasks,
  createBreakDownSubtasks,
  deleteSubtask,
  updateSubtask,
  toggleSubtaskStatus,
} from "@/feature/task-details/services/subtask-service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BreakdownSubtaskDTO } from "../models/breakdown-subtask-dto";
import { SubtaskDTO } from "../models/subtask-dto";
import { subtaskKeys, taskKeys } from "@/shared/constants/query-key-factory";

export const useSubtaskMutations = () => {
  const queryClient = useQueryClient();
  const breakdownMutation = useMutation<BreakdownSubtaskDTO[] | undefined, void, number>({
    mutationFn: createBreakDownSubtasks,
    onSuccess: (data) => {
      console.log("Subtasks created:", data);
    },
    onError: (error) => {
      console.error("Failed to create subtasks:", error);
    },
  });

  const replaceSubtasksMutation = useMutation({
    mutationFn: replaceSubtasks,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: subtaskKeys.all(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (error) => {
      console.error("Failed to add subtasks:", error);
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, parentTaskId }: { subtaskId: number; parentTaskId: number }) =>
      deleteSubtask(subtaskId),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: subtaskKeys.all(variables.parentTaskId) });
      const previous = queryClient.getQueryData<SubtaskDTO[]>(
        subtaskKeys.all(variables.parentTaskId),
      );
      queryClient.setQueryData<SubtaskDTO[]>(
        subtaskKeys.all(variables.parentTaskId),
        (current) => (current ?? []).filter((s) => s.subTaskId !== variables.subtaskId),
      );
      return { previous };
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(subtaskKeys.all(variables.parentTaskId), context.previous);
      }
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

  const updateSubtasksOrderMutation = useMutation({
    mutationFn: async ({ subtasks }: { parentTaskId: number; subtasks: SubtaskDTO[] }) => {
      for (const subtask of subtasks) {
        await updateSubtask(subtask);
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: subtaskKeys.all(variables.parentTaskId) });
      const previous = queryClient.getQueryData<SubtaskDTO[]>(
        subtaskKeys.all(variables.parentTaskId),
      );
      queryClient.setQueryData(subtaskKeys.all(variables.parentTaskId), variables.subtasks);
      return { previous };
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(subtaskKeys.all(variables.parentTaskId), context.previous);
      }
      console.error("Failed to update subtasks order:", error);
    },
    // Avoid forcing a refetch; we already updated cache optimistically.
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

    // Add/Replace subtasks
    replaceSubtasks: replaceSubtasksMutation.mutateAsync,
    isReplacingSubtasks: replaceSubtasksMutation.isPending,

    // Delete subtask
    deleteSubtask: deleteSubtaskMutation.mutateAsync,
    isDeletingSubtask: deleteSubtaskMutation.isPending,

    //Update subtask
    updateSubtask: updateSubtaskMutation.mutateAsync,
    isUpdatingSubtask: updateSubtaskMutation.isPending,

    // Update subtask orders (batched)
    updateSubtasksOrder: updateSubtasksOrderMutation.mutateAsync,
    isUpdatingSubtasksOrder: updateSubtasksOrderMutation.isPending,

    // Toggle subtask status
    toggleSubtaskStatus: toggleSubtaskStatusMutation.mutateAsync,
    isTogglingSubtaskStatus: toggleSubtaskStatusMutation.isPending,
  };
};

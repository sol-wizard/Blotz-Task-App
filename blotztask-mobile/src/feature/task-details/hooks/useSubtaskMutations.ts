import {
  replaceSubtasks,
  createBreakDownSubtasks,
  deleteSubtask,
  updateSubtask,
} from "@/feature/task-details/services/subtask-service";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useSubtaskMutations = () => {
  const queryClient = useQueryClient();
  const breakdownMutation = useMutation({
    mutationFn: createBreakDownSubtasks,
    onSuccess: (data) => {
      console.log("Subtasks created:", data);
      // generated on the fly, no need to update queryClient, just return to component
    },
    onError: (error) => {
      console.error("Failed to create subtasks:", error);
    },
  });

  const replaceSubtasksMutation = useMutation({
    mutationFn: replaceSubtasks,
    onSuccess: (_, variables) => {
      console.log("Added/Replaced subtasks", variables.subtasks, "to", variables.taskId);
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.taskId] });
    },
    onError: (error) => {
      console.error("Failed to add subtasks:", error);
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, parentTaskId }: { subtaskId: number; parentTaskId: number }) =>
      deleteSubtask(subtaskId),
    onSuccess: (_, variables) => {
      console.log("Deleted subtask", variables.subtaskId);
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.parentTaskId] });
    },
    onError: (error) => {
      console.error("Failed to delete subtask:", error);
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: updateSubtask,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.parentTaskId] });
    },
    onError: (error) => {
      console.error("Failed to update subtask:", error);
    },
  });

  return {
    // Breakdown
    breakDownTask: breakdownMutation.mutateAsync,
    isBreakingDown: breakdownMutation.isPending,
    breakDownError: breakdownMutation.error,

    // Add/Replace subtasks
    replaceSubtasks: replaceSubtasksMutation.mutateAsync,
    isReplacingSubtasks: replaceSubtasksMutation.isPending,
    replaceSubtasksError: replaceSubtasksMutation.error,

    // Delete subtask
    deleteSubtask: deleteSubtaskMutation.mutateAsync,
    isDeletingSubtask: deleteSubtaskMutation.isPending,
    deleteSubtaskError: deleteSubtaskMutation.error,

    //Update subtask
    updateSubtask: updateSubtaskMutation.mutateAsync,
    isUpdatingSubtask: updateSubtaskMutation.isPending,
    isUpdateSubtaskError: updateSubtaskMutation.error,
  };
};

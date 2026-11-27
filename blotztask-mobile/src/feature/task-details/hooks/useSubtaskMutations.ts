import {
  deleteSubtask,
  updateSubtask,
  toggleSubtaskStatus,
  addSubtask,
} from "@/feature/task-details/services/subtask-service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subtaskKeys, taskKeys } from "@/shared/constants/query-key-factory";
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
      analytics.trackSubtaskCreated();
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

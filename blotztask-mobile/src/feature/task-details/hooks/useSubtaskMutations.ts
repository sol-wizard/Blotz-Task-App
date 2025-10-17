import { createBreakDownSubtasks } from "@/shared/services/subtask-service";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useSubtaskMutations = () => {
  const queryClient = useQueryClient();
  const breakdownMutation = useMutation({
    mutationFn: createBreakDownSubtasks,
    onSuccess: (data, taskId) => {
      console.log("Subtasks created:", data);
      queryClient.invalidateQueries({ queryKey: ["subtasks", taskId] });
    },
    onError: (error) => {
      console.error("Failed to create subtasks:", error);
    },
  });

  return {
    breakDownTask: breakdownMutation.mutateAsync,
    isBreakingDown: breakdownMutation.isPending,
    breakDownError: breakdownMutation.error,
  };
};

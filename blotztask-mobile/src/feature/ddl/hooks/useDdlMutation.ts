import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePin, deleteDeadlineTask } from "../services/ddl-services";
import { ddlKeys } from "@/shared/constants/query-key-factory";

const useDdlMutation = () => {
  const queryClient = useQueryClient();

  const updatePinMutation = useMutation({
    mutationFn: ({ taskId, isPinned }: { taskId: number; isPinned: boolean }) =>
      updatePin(taskId, isPinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ddlKeys.all });
    },
  });

  const deleteDeadlineTaskMutation = useMutation({
    mutationFn: (taskId: number) => deleteDeadlineTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ddlKeys.all });
    },
  });

  return {
    updatePin: updatePinMutation.mutate,
    isUpdatingPin: updatePinMutation.isPending,
    deleteDeadlineTask: deleteDeadlineTaskMutation.mutate,
    isDeletingDeadlineTask: deleteDeadlineTaskMutation.isPending,
  };
};

export default useDdlMutation;

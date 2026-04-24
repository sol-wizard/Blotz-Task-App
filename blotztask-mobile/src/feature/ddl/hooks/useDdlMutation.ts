import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePin, deleteDeadlineTask } from "../services/ddl-services";
import { toggleTaskCompletion } from "@/shared/services/task-service";
import { ddlKeys, taskKeys } from "@/shared/constants/query-key-factory";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";

const useDdlMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation("deadline");

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ddlKeys.all });
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
  };

  const updatePinMutation = useMutation({
    mutationFn: ({ taskId, isPinned }: { taskId: number; isPinned: boolean }) =>
      updatePin(taskId, isPinned),
    onMutate: async ({ taskId, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: ddlKeys.all });
      const previousDdlTasks = queryClient.getQueryData<DeadlineTaskDTO[]>(ddlKeys.all);

      if (previousDdlTasks) {
        queryClient.setQueryData<DeadlineTaskDTO[]>(ddlKeys.all, (old) =>
          old?.map((t) => (t.id === taskId ? { ...t, isPinned } : t)),
        );
      }

      return { previousDdlTasks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousDdlTasks) {
        queryClient.setQueryData(ddlKeys.all, context.previousDdlTasks);
      }
      Toast.show({
        type: "error",
        text1: t("errors.update_pin"),
      });
    },
    onSettled: () => {
      invalidateAll();
    },
  });

  const deleteDeadlineTaskMutation = useMutation({
    mutationFn: (taskId: number) => deleteDeadlineTask(taskId),
    onSuccess: () => {
      invalidateAll();
      Toast.show({
        type: "warning",
        text1: t("success.removed"),
      });
    },
    onError: () => {
      Toast.show({
        type: "error",
        text1: t("errors.delete_task"),
      });
    },
  });

  const markAsDoneMutation = useMutation({
    mutationFn: (taskId: number) => toggleTaskCompletion(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ddlKeys.all });
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousDdlTasks = queryClient.getQueryData<DeadlineTaskDTO[]>(ddlKeys.all);

      if (previousDdlTasks) {
        queryClient.setQueryData<DeadlineTaskDTO[]>(ddlKeys.all, (old) =>
          old?.map((t) => (t.id === taskId ? { ...t, isDone: !t.isDone } : t)),
        );
      }

      return { previousDdlTasks };
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousDdlTasks) {
        queryClient.setQueryData(ddlKeys.all, context.previousDdlTasks);
      }
      Toast.show({
        type: "error",
        text1: t("errors.mark_as_done"),
      });
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

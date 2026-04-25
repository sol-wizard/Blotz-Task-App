import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePin, deleteDeadlineTask } from "../services/ddl-services";
import { toggleTaskCompletion } from "@/shared/services/task-service";
import { ddlKeys, taskKeys } from "@/shared/constants/query-key-factory";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { DeadlineTaskDTO } from "../models/deadline-task-dto";

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

    onSettled: () => {
      invalidateAll();
    },
  });

  const deleteDeadlineTaskMutation = useMutation({
    mutationFn: (taskId: number) => deleteDeadlineTask(taskId),
    onSuccess: (_data, taskId) => {
      invalidateAll();
      Toast.show({
        type: "warning",
        text1: t("success.removed"),
      });
      console.log(`[Mutation Success] task ${taskId} is removed from ddl`);
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

    onSuccess: (_data, taskId) => {
      console.log(`[Mutation Success] task ${taskId} is done`);
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

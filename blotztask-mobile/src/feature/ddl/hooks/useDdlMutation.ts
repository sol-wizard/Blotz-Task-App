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
    mutationFn: async ({ taskId, isPinned }: { taskId: number; isPinned: boolean }) => {
      // If we are pinning a task, find and unpin any other pinned task first
      if (isPinned) {
        const ddlTasks = queryClient.getQueryData<any[]>(ddlKeys.all);
        if (ddlTasks) {
          const previouslyPinnedTask = ddlTasks.find((t) => t.isPinned && t.id !== taskId);
          if (previouslyPinnedTask) {
            await updatePin(previouslyPinnedTask.id, false);
          }
        }
      }
      return updatePin(taskId, isPinned);
    },
    onSuccess: () => {
      invalidateAll();
    },
    onError: () => {
      Toast.show({
        type: "error",
        text1: t("errors.update_pin"),
      });
    },
  });

  const deleteDeadlineTaskMutation = useMutation({
    mutationFn: (taskId: number) => deleteDeadlineTask(taskId),
    onSuccess: () => {
      invalidateAll();
      Toast.show({
        type: "success",
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
    onSuccess: () => {
      invalidateAll();
    },
    onError: () => {
      Toast.show({
        type: "error",
        text1: t("errors.mark_as_done"),
      });
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

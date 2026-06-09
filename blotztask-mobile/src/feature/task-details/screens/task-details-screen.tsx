import React from "react";
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DetailsView from "@/feature/task-details/components/details-view";
import SubtasksView from "@/feature/task-details/components/subtasks-view";
import { theme } from "@/shared/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import LoadingScreen from "@/shared/components/loading-screen";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { ASSETS } from "@/shared/constants/assets";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import {
  TaskRangeTimeCard,
  TaskSingleTimeCard,
} from "@/feature/task-details/components/task-time-card";
import { useTranslation } from "react-i18next";
import { ReturnButton } from "@/shared/components/return-button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { virtualTaskDetailKeys } from "@/feature/task-details/util/virtual-task-detail-cache";
import {
  getRecurringTaskId,
  hasTaskItemId,
  isVirtualRecurringOccurrence,
} from "@/shared/util/task-occurrence-identity";
import {
  TASK_DETAIL_ROUTE_MODE,
  isTaskDetailRouteMode,
  TaskDetailRouteMode,
} from "@/feature/task-details/util/task-detail-route-mode";

function selectTaskByRouteMode({
  mode,
  persistedTask,
  virtualTask,
}: {
  mode: TaskDetailRouteMode | null;
  persistedTask?: TaskDetailDTO;
  virtualTask?: TaskDetailDTO;
}) {
  if (mode === TASK_DETAIL_ROUTE_MODE.Persisted) return persistedTask;
  if (mode === TASK_DETAIL_ROUTE_MODE.Virtual) return virtualTask;
  return undefined;
}

export default function TaskDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    taskId?: string;
    recurringTaskId?: string;
    occurrenceDate?: string;
    virtualTaskCacheKey?: string;
  }>();
  const mode = isTaskDetailRouteMode(params.mode) ? params.mode : null;
  const taskId = params.taskId ? Number(params.taskId) : null;
  const queryClient = useQueryClient();
  const virtualTaskDetailQueryKey = virtualTaskDetailKeys.byKey(
    params.virtualTaskCacheKey ?? "__missing__",
  );
  const { data: virtualTask } = useQuery<TaskDetailDTO | undefined>({
    queryKey: virtualTaskDetailQueryKey,
    queryFn: () => queryClient.getQueryData<TaskDetailDTO>(virtualTaskDetailQueryKey),
    enabled: false,
  });
  const { selectedTask: persistedTask, isLoading } = useTaskById({
    taskId: taskId ?? null,
    enabled: mode === TASK_DETAIL_ROUTE_MODE.Persisted && taskId != null,
  });
  const selectedTask = selectTaskByRouteMode({ mode, persistedTask, virtualTask });
  const { updateTask, updateRecurringOccurrence, isUpdating, isUpdatingRecurringOccurrence } =
    useTaskMutations();

  const { t } = useTranslation();

  const handleUpdateDescription = async (newDescription: string) => {
    if (!selectedTask) return;
    if (newDescription === (selectedTask.description ?? "")) return;

    const dto = {
      title: selectedTask.title,
      description: newDescription,
      startTime: convertToDateTimeOffset(new Date(selectedTask.startTime)),
      endTime: convertToDateTimeOffset(new Date(selectedTask.endTime)),
      labelId: selectedTask.label?.labelId,
      timeType: selectedTask.timeType,
      notificationId: selectedTask.notificationId,
      isDeadline: selectedTask.isDeadline,
    };

    if (hasTaskItemId(selectedTask)) {
      await updateTask({
        taskId: selectedTask.id,
        dto,
      });
      return;
    }

    if (recurringTaskId == null || !params.occurrenceDate) return;

    await updateRecurringOccurrence({
      recurringTaskId,
      occurrenceDate: params.occurrenceDate,
      dto,
    });
  };

  if (mode === TASK_DETAIL_ROUTE_MODE.Persisted && isLoading) {
    return <LoadingScreen />;
  }

  if (!selectedTask) {
    console.warn("No selected task found");
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-gray-600">{t("tasks:details.notFound")}</Text>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
        >
          <Text className="text-blue-500 mt-2">{t("common:buttons.goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const recurringTaskId = getRecurringTaskId(selectedTask);
  const isSaving = isUpdating || isUpdatingRecurringOccurrence;

  const getTranslatedLabelName = (labelName: string): string => {
    const lowerName = labelName.toLowerCase();
    const translationKey = `tasks:categories.${lowerName}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : labelName;
  };

  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1"
      style={{ backgroundColor: selectedTask.label?.color ?? theme.colors.fallback }}
    >
      <View
        pointerEvents="box-none"
        className="flex pt-2 flex-row justify-between w-full px-8 mb-2"
      >
        <ReturnButton />
        <View className="flex-row gap-2">
          <View className="px-3 py-1 rounded-xl border border-black">
            <Text className={`text-sm font-medium text-black`}>
              {selectedTask.isDone ? t("common:status.done") : t("common:status.todo")}
            </Text>
          </View>

          {selectedTask.label && (
            <View className="px-3 py-1 rounded-xl border border-black flex-shrink">
              <Text className="text-sm font-medium text-black" numberOfLines={1}>
                {getTranslatedLabelName(selectedTask.label.name)}
              </Text>
            </View>
          )}
        </View>
      </View>
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
        }}
      >
        <View className="pb-6 px-8">
          <View className="flex-row items-start justify-center my-4">
            <Text className="flex-1 font-balooBold text-3xl leading-normal">
              {selectedTask.title}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (isVirtualRecurringOccurrence(selectedTask)) {
                  if (
                    recurringTaskId == null ||
                    !params.occurrenceDate ||
                    !params.virtualTaskCacheKey
                  ) {
                    return;
                  }

                  router.push({
                    pathname: "/(protected)/task-edit",
                    params: {
                      mode: TASK_DETAIL_ROUTE_MODE.Virtual,
                      recurringTaskId,
                      occurrenceDate: params.occurrenceDate,
                      virtualTaskCacheKey: params.virtualTaskCacheKey,
                    },
                  });
                  return;
                }

                router.push({
                  pathname: "/(protected)/task-edit",
                  params: { mode: TASK_DETAIL_ROUTE_MODE.Persisted, taskId: selectedTask.id },
                });
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ASSETS.editIcon width={28} height={28} fill="#444964" />
            </TouchableOpacity>
          </View>

          {selectedTask.startTime === selectedTask.endTime ? (
            <TaskSingleTimeCard startTime={selectedTask.startTime} />
          ) : (
            <TaskRangeTimeCard startTime={selectedTask.startTime} endTime={selectedTask.endTime} />
          )}
        </View>
      </TouchableWithoutFeedback>

      <View className="flex-1 pt-6 px-6 bg-white rounded-t-[3rem]">
        <View className="flex-row justify-around mb-6">
          <DetailsView
            key={`${selectedTask.id ?? "virtual"}-${selectedTask.description ?? ""}`}
            initialDescription={selectedTask.description ?? ""}
            onSave={handleUpdateDescription}
            isUpdating={isSaving}
          />
        </View>

        <View className="flex-1 px-4">
          {hasTaskItemId(selectedTask) && <SubtasksView parentTask={selectedTask} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

import React from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createEventInCalendarAsync } from "expo-calendar/legacy";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import Toast from "react-native-toast-message";
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
import {
  createVirtualTaskDetailCacheKey,
  virtualTaskDetailKeys,
} from "@/feature/task-details/util/virtual-task-detail-cache";
import {
  getRecurringOccurrenceDate,
  getRecurringTaskId,
  hasTaskItemId,
  isVirtualRecurringOccurrence,
} from "@/shared/util/task-occurrence-identity";
import {
  TASK_DETAIL_ROUTE_MODE,
  isTaskDetailRouteMode,
  TaskDetailRouteMode,
} from "@/feature/task-details/util/task-detail-route-mode";
import { BreakdownTaskTarget } from "@/feature/task-details/services/subtask-service";

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

// TODO: This part may need optimization in the future.
export default function TaskDetailsScreen() {
  const router = useRouter();
  const [isExportingToCalendar, setIsExportingToCalendar] = React.useState(false);
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
  const recurringTaskId = selectedTask ? getRecurringTaskId(selectedTask) : null;
  const occurrenceDate = selectedTask ? getRecurringOccurrenceDate(selectedTask) : null;
  const supportsAppleCalendarExport =
    Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 17;

  React.useEffect(() => {
    if (mode !== TASK_DETAIL_ROUTE_MODE.Virtual || !selectedTask) return;
    if (!isVirtualRecurringOccurrence(selectedTask)) return;
    if (recurringTaskId == null || !occurrenceDate) return;

    const virtualTaskCacheKey = createVirtualTaskDetailCacheKey(selectedTask, occurrenceDate);
    const paramsAlreadyMatch =
      params.recurringTaskId === String(recurringTaskId) &&
      params.occurrenceDate === occurrenceDate &&
      params.virtualTaskCacheKey === virtualTaskCacheKey;

    if (paramsAlreadyMatch) return;

    queryClient.setQueryData(virtualTaskDetailKeys.byKey(virtualTaskCacheKey), selectedTask);
    router.setParams({
      recurringTaskId: String(recurringTaskId),
      occurrenceDate,
      virtualTaskCacheKey,
    });
  }, [
    mode,
    occurrenceDate,
    params.occurrenceDate,
    params.recurringTaskId,
    params.virtualTaskCacheKey,
    queryClient,
    recurringTaskId,
    router,
    selectedTask,
  ]);

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

    if (recurringTaskId == null || !occurrenceDate) return;

    await updateRecurringOccurrence({
      recurringTaskId,
      occurrenceDate,
      dto,
    });
  };

  const handleExportToAppleCalendar = async () => {
    if (!selectedTask || isExportingToCalendar) return;

    setIsExportingToCalendar(true);

    try {
      const description = selectedTask.description?.trim();
      const result = await createEventInCalendarAsync({
        title: selectedTask.title,
        startDate: new Date(selectedTask.startTime),
        ...(selectedTask.startTime !== selectedTask.endTime
          ? { endDate: new Date(selectedTask.endTime) }
          : {}),
        ...(description ? { notes: description } : {}),
      });

      if (result.action === "saved") {
        Toast.show({
          type: "success",
          text1: t("tasks:details.calendarExportSuccess"),
        });
      }
    } catch {
      Toast.show({
        type: "error",
        text1: t("tasks:details.calendarExportFailed"),
      });
    } finally {
      setIsExportingToCalendar(false);
    }
  };

  const handleBreakdownComplete = React.useCallback(
    (parentTaskId: number) => {
      if (!selectedTask || hasTaskItemId(selectedTask)) return;

      router.replace({
        pathname: "/(protected)/task-details",
        params: {
          mode: TASK_DETAIL_ROUTE_MODE.Persisted,
          taskId: parentTaskId,
        },
      });
    },
    [router, selectedTask],
  );

  const breakdownTarget: BreakdownTaskTarget | undefined = !selectedTask
    ? undefined
    : hasTaskItemId(selectedTask)
      ? { taskId: selectedTask.id }
      : recurringTaskId != null && occurrenceDate
        ? { recurringTaskId, occurrenceDate }
        : undefined;

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
                  if (recurringTaskId == null || !occurrenceDate) return;

                  const virtualTaskCacheKey = createVirtualTaskDetailCacheKey(
                    selectedTask,
                    occurrenceDate,
                  );
                  queryClient.setQueryData(
                    virtualTaskDetailKeys.byKey(virtualTaskCacheKey),
                    selectedTask,
                  );

                  router.push({
                    pathname: "/(protected)/task-edit",
                    params: {
                      mode: TASK_DETAIL_ROUTE_MODE.Virtual,
                      recurringTaskId,
                      occurrenceDate,
                      virtualTaskCacheKey,
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

          {supportsAppleCalendarExport && (
            <TouchableOpacity
              onPress={() => {
                void handleExportToAppleCalendar();
              }}
              disabled={isExportingToCalendar}
              accessibilityRole="button"
              accessibilityLabel={t("tasks:details.addToAppleCalendar")}
              className="mt-1 self-start flex-row items-center rounded-xl border border-[#444964] px-4 py-2"
              style={{ opacity: isExportingToCalendar ? 0.6 : 1 }}
            >
              {isExportingToCalendar ? (
                <ActivityIndicator size="small" color="#444964" />
              ) : (
                <MaterialCommunityIcons name="calendar-plus" size={18} color="#444964" />
              )}
              <Text className="ml-2 font-balooBold text-sm text-[#444964]">
                {t("tasks:details.addToAppleCalendar")}
              </Text>
            </TouchableOpacity>
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
          <SubtasksView
            parentTask={selectedTask}
            breakdownTarget={breakdownTarget}
            onBreakdownComplete={handleBreakdownComplete}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

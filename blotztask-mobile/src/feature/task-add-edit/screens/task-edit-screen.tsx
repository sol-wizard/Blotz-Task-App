import TaskForm from "@/feature/task-add-edit/task-form";
import { useLocalSearchParams, useRouter } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import LoadingScreen from "@/shared/components/loading-screen";
import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";
import { ReturnButton } from "@/shared/components/return-button";
import { useQueryClient } from "@tanstack/react-query";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { virtualTaskDetailKeys } from "@/feature/task-details/util/virtual-task-detail-cache";
import { hasTaskItemId } from "@/shared/util/task-occurrence-identity";
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

export default function TaskEditScreen() {
  const {
    updateTask,
    updateRecurringOccurrence,
    isUpdating,
    isUpdatingRecurringOccurrence,
  } = useTaskMutations();
  const params = useLocalSearchParams<{
    mode?: string;
    taskId?: string;
    recurringTaskId?: string;
    occurrenceDate?: string;
    virtualTaskCacheKey?: string;
  }>();
  const mode = isTaskDetailRouteMode(params.mode) ? params.mode : null;
  const taskId = params.taskId ? Number(params.taskId) : null;
  const recurringTaskId = params.recurringTaskId ? Number(params.recurringTaskId) : null;
  const queryClient = useQueryClient();
  const virtualTask = params.virtualTaskCacheKey
    ? queryClient.getQueryData<TaskDetailDTO>(
        virtualTaskDetailKeys.byKey(params.virtualTaskCacheKey),
      )
    : undefined;
  const { selectedTask: persistedTask, isLoading, isFetching } = useTaskById({
    taskId,
    enabled: mode === TASK_DETAIL_ROUTE_MODE.Persisted && taskId != null,
  });
  const selectedTask = selectTaskByRouteMode({ mode, persistedTask, virtualTask });

  const router = useRouter();

  if (
    (mode === TASK_DETAIL_ROUTE_MODE.Persisted && isLoading) ||
    !selectedTask ||
    isUpdating ||
    isUpdatingRecurringOccurrence ||
    isFetching
  ) {
    return <LoadingScreen />;
  }

  const taskEditData: TaskUpsertDTO = {
    title: selectedTask.title,
    description: selectedTask.description,
    startTime: selectedTask.startTime,
    endTime: selectedTask.endTime,
    labelId: selectedTask.label ? selectedTask.label.labelId : undefined,
    timeType: selectedTask.timeType,
    notificationId: selectedTask.notificationId,
    alertTime: selectedTask.alertTime,
    isDeadline: selectedTask.isDeadline,
    dueAt: selectedTask.dueAt,
  };

  const handleTaskSubmit = (formValues: TaskUpsertDTO) => {
    if (hasTaskItemId(selectedTask)) {
      updateTask({ taskId: selectedTask.id, dto: formValues }, { onSuccess: () => router.back() });
      return;
    }

    if (recurringTaskId == null || !params.occurrenceDate) return;

    updateRecurringOccurrence(
      {
        recurringTaskId,
        occurrenceDate: params.occurrenceDate,
        dto: formValues,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View
        style={{
          paddingTop: 8,
          paddingHorizontal: 20,
        }}
      >
        <ReturnButton />
      </View>

      <View style={{ flex: 1 }}>
        <TaskForm mode="edit" dto={taskEditData} onSubmit={handleTaskSubmit} />
      </View>
    </SafeAreaView>
  );
}

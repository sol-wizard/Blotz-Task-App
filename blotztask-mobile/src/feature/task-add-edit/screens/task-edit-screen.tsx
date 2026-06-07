import React from "react";
import TaskForm, { TaskFormDirtyFields } from "@/feature/task-add-edit/task-form";
import { useLocalSearchParams, useRouter } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import LoadingScreen from "@/shared/components/loading-screen";
import { TaskRecurrence, TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";
import { ReturnButton } from "@/shared/components/return-button";
import { useQueryClient } from "@tanstack/react-query";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { virtualTaskDetailKeys } from "@/feature/task-details/util/virtual-task-detail-cache";
import { getRecurringOccurrenceIdentity, hasTaskItemId } from "@/shared/util/task-occurrence-identity";
import {
  TASK_DETAIL_ROUTE_MODE,
  isTaskDetailRouteMode,
  TaskDetailRouteMode,
} from "@/feature/task-details/util/task-detail-route-mode";
import { useTranslation } from "react-i18next";
import { RecurrenceFrequency } from "@/shared/models/recurring-task-create-dto";
import { ActionChoiceSheet } from "@/shared/components/action-choice-sheet";
import { labelKeys, taskKeys } from "@/shared/constants/query-key-factory";
import { LabelDTO } from "@/shared/models/label-dto";

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

type RecurringScopeSheetState =
  | {
      type: "scope";
      formValues: TaskUpsertDTO;
      recurringTaskId: number;
      occurrenceDate: string;
    }
  | {
      type: "future";
      formValues: TaskUpsertDTO;
      recurringTaskId: number;
      occurrenceDate: string;
      isStopRepeating: boolean;
    }
  | null;

type RecurringPatternDetails = {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek: number | null;
  dayOfMonth: number | null;
};

export default function TaskEditScreen() {
  const {
    updateTask,
    updateRecurringOccurrence,
    updateRecurringTaskFuture,
    isUpdating,
    isUpdatingRecurringOccurrence,
    isUpdatingRecurringTaskFuture,
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
  const [recurringScopeSheet, setRecurringScopeSheet] =
    React.useState<RecurringScopeSheetState>(null);

  const router = useRouter();
  const { t } = useTranslation("tasks");

  if (
    (mode === TASK_DETAIL_ROUTE_MODE.Persisted && isLoading) ||
    !selectedTask ||
    isUpdating ||
    isUpdatingRecurringOccurrence ||
    isUpdatingRecurringTaskFuture ||
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
    recurrence: selectedTask.recurringTask
      ? mapRecurringMetadataToTaskRecurrence(selectedTask.recurringTask.frequency, selectedTask.recurringTask.interval)
      : "never",
    recurrenceEndMode: selectedTask.recurringTask?.endDate ? "onDate" : "never",
    recurrenceEndDate: selectedTask.recurringTask?.endDate ?? null,
  };

  const handleTaskSubmit = (
    formValues: TaskUpsertDTO,
    dirtyFields: TaskFormDirtyFields,
  ) => {
    const recurringOccurrence = getRecurringOccurrenceIdentity(selectedTask);
    if (!recurringOccurrence) {
      if (!hasTaskItemId(selectedTask)) return;
      updateTask({ taskId: selectedTask.id, dto: formValues }, { onSuccess: () => router.back() });
      return;
    }

    if (hasRecurrenceDirtyFields(dirtyFields)) {
      setRecurringScopeSheet({
        type: "future",
        formValues,
        recurringTaskId: recurringOccurrence.recurringTaskId,
        occurrenceDate: recurringOccurrence.occurrenceDate,
        isStopRepeating: formValues.recurrence === "never",
      });
      return;
    }

    setRecurringScopeSheet({
      type: "scope",
      formValues,
      recurringTaskId: recurringOccurrence.recurringTaskId,
      occurrenceDate: recurringOccurrence.occurrenceDate,
    });
  };

  const saveThisOccurrence = (
    formValues: TaskUpsertDTO,
    selectedRecurringTaskId: number,
    occurrenceDate: string,
  ) => {
    updateRecurringOccurrence(
      {
        recurringTaskId: selectedRecurringTaskId,
        occurrenceDate,
        dto: formValues,
      },
      {
        onSuccess: () => {
          updateTaskDetailCache(formValues);
          router.back();
        },
      },
    );
  };

  const saveFutureOccurrences = (
    formValues: TaskUpsertDTO,
    selectedRecurringTaskId: number,
    occurrenceDate: string,
    recurrenceChanged: boolean,
  ) => {
    const recurrenceDetails = mapTaskRecurrenceToRecurringPattern(formValues, occurrenceDate);
    updateRecurringTaskFuture(
      {
        recurringTaskId: selectedRecurringTaskId,
        effectiveDate: occurrenceDate,
        dto: formValues,
        stopRepeating: formValues.recurrence === "never",
        frequency: recurrenceDetails?.frequency,
        interval: recurrenceDetails?.interval,
        daysOfWeek: recurrenceDetails?.daysOfWeek,
        dayOfMonth: recurrenceDetails?.dayOfMonth,
        endDate: formValues.recurrenceEndDate ?? null,
        endDateChanged: recurrenceChanged,
        deadlineTimeZoneId: formValues.isDeadline
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : null,
      },
      {
        onSuccess: () => {
          updateTaskDetailCache(formValues, recurrenceDetails);
          router.back();
        },
      },
    );
  };

  const updateTaskDetailCache = (
    formValues: TaskUpsertDTO,
    recurrenceDetails?: RecurringPatternDetails | null,
  ) => {
    const labels = queryClient.getQueryData<LabelDTO[]>(labelKeys.all) ?? [];
    const updateCachedTask = (currentTask: TaskDetailDTO | undefined) => {
      if (!currentTask) return currentTask;

      const label = formValues.labelId
        ? labels.find((candidate) => candidate.labelId === formValues.labelId) ?? currentTask.label
        : undefined;

      return {
        ...currentTask,
        title: formValues.title,
        description: formValues.description,
        startTime: formValues.startTime,
        endTime: formValues.endTime,
        label,
        timeType: formValues.timeType,
        notificationId: formValues.notificationId,
        alertTime: formValues.alertTime,
        isDeadline: formValues.isDeadline,
        dueAt: formValues.dueAt,
        recurringTask:
          recurrenceDetails === undefined
            ? currentTask.recurringTask
            : mapFormValuesToRecurringMetadata(currentTask, formValues, recurrenceDetails),
      };
    };

    if (params.virtualTaskCacheKey) {
      queryClient.setQueryData<TaskDetailDTO>(
        virtualTaskDetailKeys.byKey(params.virtualTaskCacheKey),
        updateCachedTask,
      );
    }

    if (hasTaskItemId(selectedTask)) {
      queryClient.setQueryData<TaskDetailDTO>(
        taskKeys.byId(selectedTask.id),
        updateCachedTask,
      );
    }
  };

  const closeRecurringScopeSheet = () => setRecurringScopeSheet(null);

  const recurringScopeSheetTitle = recurringScopeSheet
    ? recurringScopeSheet.type === "scope"
      ? t("recurrence.editTitle")
      : recurringScopeSheet.isStopRepeating
        ? t("recurrence.stopTitle")
        : t("recurrence.updateTitle")
    : "";
  const recurringScopeSheetMessage = recurringScopeSheet
    ? recurringScopeSheet.type === "scope"
      ? t("recurrence.editMessage")
      : recurringScopeSheet.isStopRepeating
        ? t("recurrence.stopMessage")
        : t("recurrence.updateMessage")
    : "";
  const recurringScopeSheetActions =
    recurringScopeSheet == null
      ? []
      : recurringScopeSheet.type === "scope"
        ? [
            {
              key: "this-date",
              title: t("recurrence.editThisDate"),
              description: t("recurrence.editThisDateDescription"),
              icon: "calendar-today" as const,
              onPress: () => {
                const sheet = recurringScopeSheet;
                closeRecurringScopeSheet();
                saveThisOccurrence(sheet.formValues, sheet.recurringTaskId, sheet.occurrenceDate);
              },
            },
            {
              key: "future-dates",
              title: t("recurrence.editFutureDates"),
              description: t("recurrence.editFutureDatesDescription"),
              icon: "calendar-sync" as const,
              onPress: () => {
                const sheet = recurringScopeSheet;
                closeRecurringScopeSheet();
                saveFutureOccurrences(sheet.formValues, sheet.recurringTaskId, sheet.occurrenceDate, false);
              },
            },
          ]
        : [
            {
              key: "future-dates",
              title: recurringScopeSheet.isStopRepeating
                ? t("recurrence.stopFromDate")
                : t("recurrence.editFutureDates"),
              description: recurringScopeSheet.isStopRepeating
                ? t("recurrence.stopFromDateDescription")
                : t("recurrence.updateFutureDescription"),
              icon: recurringScopeSheet.isStopRepeating
                ? ("calendar-remove" as const)
                : ("calendar-sync" as const),
              destructive: recurringScopeSheet.isStopRepeating,
              onPress: () => {
                const sheet = recurringScopeSheet;
                closeRecurringScopeSheet();
                saveFutureOccurrences(sheet.formValues, sheet.recurringTaskId, sheet.occurrenceDate, true);
              },
            },
          ];

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
        <TaskForm
          mode="edit"
          dto={taskEditData}
          recurrenceEditMode={selectedTask.recurringOccurrence ? "futureOnly" : "hidden"}
          onSubmit={handleTaskSubmit}
        />
      </View>
      <ActionChoiceSheet
        visible={recurringScopeSheet != null}
        title={recurringScopeSheetTitle}
        message={recurringScopeSheetMessage}
        actions={recurringScopeSheetActions}
        cancelText={t("recurrence.editCancel")}
        onClose={closeRecurringScopeSheet}
      />
    </SafeAreaView>
  );
}

function hasRecurrenceDirtyFields(
  dirtyFields: TaskFormDirtyFields,
): boolean {
  return Boolean(
    dirtyFields.recurrence ||
      dirtyFields.recurrenceEndMode ||
      dirtyFields.recurrenceEndDate,
  );
}

function mapRecurringMetadataToTaskRecurrence(
  frequency: RecurrenceFrequency,
  interval: number,
): TaskRecurrence {
  if (frequency === "Daily") return "daily";
  if (frequency === "Weekly") return interval === 2 ? "biweekly" : "weekly";
  if (frequency === "Monthly") return "monthly";
  if (frequency === "Yearly") return "yearly";
  return "never";
}

function mapTaskRecurrenceToRecurringPattern(
  task: TaskUpsertDTO,
  occurrenceDate: string,
): RecurringPatternDetails | null {
  const recurrence = task.recurrence;
  if (!recurrence || recurrence === "never" || recurrence === "custom") return null;

  const frequencyMap = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  } as const satisfies Record<Exclude<TaskRecurrence, "never" | "custom">, RecurrenceFrequency>;

  return {
    frequency: frequencyMap[recurrence],
    interval: recurrence === "biweekly" ? 2 : 1,
    daysOfWeek:
      recurrence === "weekly" || recurrence === "biweekly"
        ? getWeeklyDayFlag(occurrenceDate)
        : null,
    dayOfMonth: recurrence === "monthly" ? Number(occurrenceDate.slice(8, 10)) : null,
  };
}

function mapFormValuesToRecurringMetadata(
  currentTask: TaskDetailDTO,
  formValues: TaskUpsertDTO,
  recurrenceDetails: RecurringPatternDetails | null,
): TaskDetailDTO["recurringTask"] {
  if (!recurrenceDetails) return null;

  return {
    frequency: recurrenceDetails.frequency,
    interval: recurrenceDetails.interval,
    daysOfWeek: recurrenceDetails.daysOfWeek,
    dayOfMonth: recurrenceDetails.dayOfMonth,
    startDate: currentTask.recurringTask?.startDate ?? currentTask.startTime,
    endDate: formValues.recurrenceEndDate ?? null,
  };
}

function getWeeklyDayFlag(dateOnly: string): number {
  const [year, month, dayOfMonth] = dateOnly.split("-").map(Number);
  const day = new Date(year, month - 1, dayOfMonth).getDay();
  const dayFlags = [64, 1, 2, 4, 8, 16, 32] as const;
  return dayFlags[day];
}

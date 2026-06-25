import React, { useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import MaterialIcons from "@react-native-vector-icons/material-icons/static";
import { parseISO } from "date-fns";
import TasksCheckbox from "@/shared/components/task-checkbox";

import { SharedValue, useDerivedValue, withTiming } from "react-native-reanimated";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { queryClient } from "@/shared/util/queryClient";
import { router } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useRecurringTaskMutations } from "../hooks/useRecurringTaskMutations";
import { useSubtaskMutations } from "@/feature/task-details/hooks/useSubtaskMutations";
import { cancelNotification } from "@/shared/util/cancel-notification";
import { formatDateRange } from "../util/format-date-range";
import { formatTaskEndTime } from "../util/format-task-end-time";
import { AnimatedChevron } from "@/shared/components/chevron";
import { SubtaskProgressBar } from "./subtask-progress-bar";
import SubtaskList from "./subtask-list";
import { TaskCardRightActions } from "./task-card-right-actions";
import { TaskCardLeftActions } from "./task-card-left-actions";
import { theme } from "@/shared/constants/theme";
import { getMilestoneKey } from "@/feature/pomodoro/utils/getMilestoneKey";
import { useTranslation } from "react-i18next";
import { usePomodoroTimer } from "@/feature/pomodoro/hooks/usePomodoroTimer";
import { SwitchTaskModal } from "./pomodoro-switch-modal";
import Toast from "react-native-toast-message";
import { ensureTaskItemForTaskCard } from "../util/ensure-task-item-for-task-card";
import { taskKeys } from "@/shared/constants/query-key-factory";
import {
  createVirtualTaskDetailCacheKey,
  virtualTaskDetailKeys,
} from "@/feature/task-details/util/virtual-task-detail-cache";
import { TASK_DETAIL_ROUTE_MODE } from "@/feature/task-details/util/task-detail-route-mode";
import {
  getRecurringOccurrenceIdentity,
  getRecurringOccurrenceDate,
  getRecurringTaskId,
  hasTaskItemId,
  isVirtualRecurringOccurrence,
} from "@/shared/util/task-occurrence-identity";
import { ActionChoiceSheet } from "@/shared/components/action-choice-sheet";

// Props
interface TaskCardProps {
  task: TaskDetailDTO;
  deleteTask: (task: TaskDetailDTO) => void;
  isDeleting: boolean;
  selectedDay?: Date;
  onOpenMode?: () => void;
  onRowOpen?: (refObject: React.RefObject<SwipeableMethods | null>) => void;
}

const TaskCard = ({ task, deleteTask, isDeleting, selectedDay, onOpenMode, onRowOpen }: TaskCardProps) => {
  const swipeRef = useRef<SwipeableMethods | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const progress = useDerivedValue(() => withTiming(isExpanded ? 1 : 0, { duration: 220 }));

  // Pomodoro session state
  const session = usePomodoroTimer((state) => state.session);
  const togglePause = usePomodoroTimer((state) => state.togglePause);
  const isThisTaskActive = session?.taskId === String(task.id);
  const isPaused = isThisTaskActive ? (session?.isPaused ?? true) : true;
  const elapsedSeconds = isThisTaskActive ? (session?.elapsedSeconds ?? 0) : 0;
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showRecurringDeleteSheet, setShowRecurringDeleteSheet] = useState(false);
  const [isBreakdownPending, setIsBreakdownPending] = useState(false);
  const [pendingFocusTaskId, setPendingFocusTaskId] = useState<number | null>(null);

  // Mutations
  const {
    toggleTask,
    deleteRecurringOccurrence,
    isToggling,
    isDeletingRecurringOccurrence,
  } = useTaskMutations();
  const {
    completeOccurrence,
    materializeOccurrenceAsync,
    isPending: isRecurringTaskPending,
  } = useRecurringTaskMutations();
  const { breakDownAndReplaceSubtasks, isBreakingDownAndReplacingSubtasks } = useSubtaskMutations();

  // Derived values
  const hasSubtasks = !!task.subtasks?.length;
  const timePeriod = formatDateRange({
    startTime: task.startTime,
    endTime: task.endTime,
    selectedDay,
  });
  const isOverdue = parseISO(task.endTime).getTime() <= new Date().getTime() && !task.isDone;
  const isLoading =
    isToggling ||
    isDeleting ||
    isDeletingRecurringOccurrence ||
    isBreakdownPending ||
    isBreakingDownAndReplacingSubtasks ||
    isRecurringTaskPending;

  const { t: tPomodoro } = useTranslation("pomodoro");
  const { t: tTasks } = useTranslation("tasks");

  // Functions
  const ensureTaskItemId = (invalidateOnMaterializeSuccess = true) =>
    ensureTaskItemForTaskCard({
      task,
      materializeOccurrence: materializeOccurrenceAsync,
      invalidateOnMaterializeSuccess,
    });

  const handleOpenTaskDetails = async () => {
    if (isLoading) return;

    swipeRef.current?.close();

    if (hasTaskItemId(task)) {
      queryClient.setQueryData(taskKeys.byId(task.id), task);
      router.push({
        pathname: "/(protected)/task-details",
        params: { mode: TASK_DETAIL_ROUTE_MODE.Persisted, taskId: task.id },
      });
      return;
    }

    if (!isVirtualRecurringOccurrence(task)) return;

    const occurrenceDate = getRecurringOccurrenceDate(task);
    const recurringTaskId = getRecurringTaskId(task);
    if (recurringTaskId == null || !occurrenceDate) return;

    const virtualTaskCacheKey = createVirtualTaskDetailCacheKey(task, occurrenceDate);
    queryClient.setQueryData(virtualTaskDetailKeys.byKey(virtualTaskCacheKey), task);
    router.push({
      pathname: "/(protected)/task-details",
      params: {
        mode: TASK_DETAIL_ROUTE_MODE.Virtual,
        recurringTaskId,
        occurrenceDate,
        virtualTaskCacheKey,
      },
    });
  };

  const handleBreakdown = async () => {
    if (isLoading) return;

    setIsBreakdownPending(true);

    try {
      const taskId = await ensureTaskItemId(false);
      const result = await breakDownAndReplaceSubtasks(taskId);

      if (result?.subtasks?.length) {
        setIsExpanded(true);
        swipeRef.current?.close();
      }
    } finally {
      setIsBreakdownPending(false);
    }
  };

  const handleDelete = async () => {
    if (isLoading) return;

    const recurringOccurrence = getRecurringOccurrenceIdentity(task);
    if (recurringOccurrence) {
      setShowRecurringDeleteSheet(true);
      return;
    }

    if (!hasTaskItemId(task)) return;

    await deleteTask(task);

    if (task.alertTime && new Date(task.alertTime) > new Date()) {
      await cancelNotification({ notificationId: task.notificationId });
    }
  };

  const deleteRecurringTaskOccurrence = (deleteFuture: boolean) => {
    const recurringOccurrence = getRecurringOccurrenceIdentity(task);
    if (!recurringOccurrence) return;

    setShowRecurringDeleteSheet(false);
    deleteRecurringOccurrence(
      {
        recurringTaskId: recurringOccurrence.recurringTaskId,
        occurrenceDate: recurringOccurrence.occurrenceDate,
        deleteFuture,
      },
      {
        onSuccess: () => {
          if (task.alertTime && new Date(task.alertTime) > new Date()) {
            void cancelNotification({ notificationId: task.notificationId });
          }
          swipeRef.current?.close();
        },
      },
    );
  };

  const handleOpenFocus = async () => {
    if (isLoading) return;

    const taskId = await ensureTaskItemId();

    if (session && session.taskId !== String(taskId)) {
      setPendingFocusTaskId(taskId);
      setShowSwitchModal(true);
    } else {
      router.push({ pathname: "/(protected)/pomodoro-focus", params: { taskId } });
    }

    swipeRef.current?.close();
  };

  const handleOpenMode = () => {
    if (session) {
      Toast.show({
        type: "warning",
        text1: tPomodoro("focusMode.modeLockedWhileRunning"),
        visibilityTime: 2500,
      });
      swipeRef.current?.close();
      return;
    }

    onOpenMode?.();
    swipeRef.current?.close();
  };

  const handleConfirmSwitch = () => {
    if (pendingFocusTaskId == null) return;

    setShowSwitchModal(false);
    swipeRef.current?.close();
    router.push({ pathname: "/(protected)/pomodoro-focus", params: { taskId: pendingFocusTaskId } });
    setPendingFocusTaskId(null);
  };

  const handleTogglePause = () => {
    togglePause();
    swipeRef.current?.close();
  };

  return (
    <>
      <ReanimatedSwipeable
        ref={swipeRef}
        onSwipeableWillOpen={() => {
          onRowOpen?.(swipeRef);
        }}
        renderLeftActions={(leftActionsProgress: SharedValue<number>) => (
          <TaskCardLeftActions
            progress={leftActionsProgress}
            onMode={handleOpenMode}
            onFocus={handleOpenFocus}
            isPomodoroActiveTask={isThisTaskActive}
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
          />
        )}
        leftThreshold={12}
        overshootLeft={false}
        dragOffsetFromRightEdge={8}
        renderRightActions={(rightActionsProgress: SharedValue<number>) => (
          <TaskCardRightActions
            progress={rightActionsProgress}
            onBreakdown={handleBreakdown}
            onDelete={handleDelete}
            isDeleting={isDeleting || isDeletingRecurringOccurrence}
            isRefreshingSubtasks={isBreakdownPending || isBreakingDownAndReplacingSubtasks}
          />
        )}
        rightThreshold={12}
        overshootRight={false}
        friction={2}
        dragOffsetFromLeftEdge={8}
      >
        <View className="flex-col bg-white rounded-3xl px-4 py-3 min-h-20 justify-center">
          <View className="justify-center">
            <View className="flex-row items-center" style={{ gap: 12 }}>
              {/* Checkbox */}
              <TasksCheckbox
                type="task"
                checked={task.isDone}
                disabled={isLoading}
                onChange={async () => {
                  if (isVirtualRecurringOccurrence(task)) {
                    const occurrenceDate = getRecurringOccurrenceDate(task);
                    const recurringTaskId = getRecurringTaskId(task);
                    if (recurringTaskId == null || !occurrenceDate) return;

                    completeOccurrence({
                      recurringTaskId,
                      occurrenceDate,
                    });
                    return;
                  }
                  if (!hasTaskItemId(task)) return;
                  toggleTask({ taskId: task.id, selectedDay });
                  if (task.alertTime && new Date(task.alertTime) > new Date()) {
                    await cancelNotification({ notificationId: task?.notificationId });
                  }
                }}
              />

              {/* Vertical label colour bar */}
              <View
                className="h-10 w-1.5 rounded-full"
                style={{ backgroundColor: task.label?.color ?? theme.colors.disabled }}
              />

              {/* DDL Tag */}
              {task.isDeadline && (
                <View className="px-1 py-0.5 rounded bg-highlight items-center justify-center">
                  <Text className="text-white font-balooBold text-xs mt-0.5">DDL</Text>
                </View>
              )}

              {/* Title + date */}
              <Pressable className="flex-1 " onPress={handleOpenTaskDetails} disabled={isLoading}>
                <View className="flex-row items-center" style={{ gap: 4 }}>
                  <Text
                    className={`text-xl font-semibold font-inter ${
                      task.isDone ? "text-neutral-400 line-through" : "text-[#444964]"
                    }`}
                    style={
                      task.isDone
                        ? {
                            textDecorationLine: "line-through",
                            textDecorationColor: "#9CA3AF",
                          }
                        : undefined
                    }
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  {getRecurringTaskId(task) && (
                    <View className="ml-1.5">
                      <MaterialIcons name="autorenew" size={17} color="#9CA3AF" />
                    </View>
                  )}
                </View>
                {timePeriod && <Text className="font-balooThin text-gray-400">{timePeriod}</Text>}
              </Pressable>

              <View className="flex-row items-center">
                <Text
                  className={`${
                    isOverdue ? "text-warning" : "text-primary"
                  } font-inter font-semibold text-lg`}
                >
                  {formatTaskEndTime(task.endTime)}
                </Text>

                <View className="ml-1 w-6 items-center justify-center">
                  {hasSubtasks && (
                    <Pressable
                      onPress={() => setIsExpanded((v) => !v)}
                      className="p-1"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      disabled={isLoading}
                    >
                      <AnimatedChevron color="#9CA3AF" progress={progress} />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>

            {isThisTaskActive && (
              <Pressable
                onPress={handleOpenFocus}
                className="mt-3 flex-row items-center justify-between bg-[#FFF7ED] px-3 py-2.5 rounded-xl"
              >
                <Text className="text-orange-400 font-inter font-semibold text-[13px]">
                  Focus · {Math.floor(elapsedSeconds / 60)} min
                </Text>

                <View className="flex-row items-center">
                  <Text className="text-gray-400 font-inter text-[12px] mr-0.5">
                    {isPaused
                      ? tPomodoro("focusMode.paused", "Paused")
                      : tPomodoro(
                          `focusMode.milestones.${getMilestoneKey(elapsedSeconds)}.subtitle`,
                        )}
                  </Text>
                  <MaterialIcons name="chevron-right" size={16} color="#9CA3AF" />
                </View>
              </Pressable>
            )}
            {hasSubtasks && <SubtaskProgressBar subtasks={task.subtasks} />}
          </View>
          {hasSubtasks && <SubtaskList task={task} progress={progress} />}
        </View>
      </ReanimatedSwipeable>
      <SwitchTaskModal
        isVisible={showSwitchModal}
        onClose={() => {
          setShowSwitchModal(false);
          setPendingFocusTaskId(null);
        }}
        onConfirm={handleConfirmSwitch}
      />
      <ActionChoiceSheet
        visible={showRecurringDeleteSheet}
        title={tTasks("recurrence.deleteTitle")}
        message={tTasks("recurrence.deleteMessage")}
        cancelText={tTasks("recurrence.deleteCancel")}
        onClose={() => setShowRecurringDeleteSheet(false)}
        actions={[
          {
            key: "this-date",
            title: tTasks("recurrence.deleteThisDate"),
            description: tTasks("recurrence.deleteThisDateDescription"),
            icon: "calendar-remove",
            destructive: true,
            onPress: () => deleteRecurringTaskOccurrence(false),
          },
          {
            key: "future-dates",
            title: tTasks("recurrence.deleteFutureDates"),
            description: tTasks("recurrence.deleteFutureDatesDescription"),
            icon: "calendar-remove",
            destructive: true,
            onPress: () => deleteRecurringTaskOccurrence(true),
          },
        ]}
      />
    </>
  );
};

export default TaskCard;

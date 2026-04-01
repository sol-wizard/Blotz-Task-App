import React, { useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import TasksCheckbox from "@/shared/components/ui/task-checkbox";

import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { queryClient } from "@/shared/util/queryClient";
import { router } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useRecurringTaskMutations } from "../hooks/useRecurringTaskMutations";
import { useSubtaskMutations } from "@/feature/task-details/hooks/useSubtaskMutations";
import { cancelNotification } from "@/shared/util/cancel-notification";
import { formatDateRange } from "../util/format-date-range";
import { AnimatedChevron } from "@/shared/components/ui/chevron";
import { showBreakdownErrorToast } from "@/shared/util/show-breakdown-error-toast";
import { AddSubtaskDTO } from "@/feature/task-details/models/add-subtask-dto";
import { analytics } from "@/shared/services/analytics";
import { SubtaskProgressBar } from "./subtask-progress-bar";
import SubtaskList from "./subtask-list";

type RightActionsProps = {
  progress: SharedValue<number>;
  taskId: number;
  onClose: () => void;
};

const RightActions = ({ progress, taskId, onClose }: RightActionsProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 120 * (1 - progress.value) }],
  }));

  return (
    <Animated.View
      className="w-50 flex-row items-center justify-end gap-3 pl-4"
      style={animatedStyle}
    >
      <Pressable
        onPress={() => {
          console.log("Pin task", taskId);
          onClose();
        }}
        className="h-20 w-20 items-center justify-center rounded-2xl bg-[#DCF5C7]"
      >
        <MaterialCommunityIcons name="arrow-up-bold" size={22} color="#5B9E2E" />
      </Pressable>

      <Pressable
        onPress={() => {
          console.log("Delete task", taskId);
          onClose();
        }}
        className="h-20 w-20 items-center justify-center rounded-2xl bg-[#FCE4E4]"
      >
        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#E05C5C" />
      </Pressable>
    </Animated.View>
  );
};

interface TaskCardProps {
  task: TaskDetailDTO;
  deleteTask: (task: TaskDetailDTO) => void;
  isDeleting: boolean;
  selectedDay?: Date;
}

const CalendarTaskCard = ({ task, deleteTask, isDeleting, selectedDay }: TaskCardProps) => {
  const swipeRef = useRef<SwipeableMethods | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const progress = useDerivedValue(() => withTiming(isExpanded ? 1 : 0, { duration: 220 }));

  const labelColor = task.label?.color ?? "#D1D1D6";

  const isVirtualTask = task.id == null;
  const isRecurringTask = task.recurringTaskId != null;

  const { t } = useTranslation("tasks");
  const { toggleTask, isToggling } = useTaskMutations();
  const { completeOccurrence, isPending: isCompletingOccurrence } = useRecurringTaskMutations();
  const { breakDownTask, isBreakingDown, replaceSubtasks, isReplacingSubtasks } =
    useSubtaskMutations();
  const isLoading =
    isToggling || isDeleting || isBreakingDown || isReplacingSubtasks || isCompletingOccurrence;

  const navigateToTaskDetails = (t: TaskDetailDTO) => {
    if (t.id == null) return;
    queryClient.setQueryData(["taskId", t.id], t);
    router.push({ pathname: "/(protected)/task-details", params: { taskId: t.id } });
  };

  const timePeriod = formatDateRange({
    startTime: task.startTime,
    endTime: task.endTime,
    selectedDay,
  });

  const isOverdue = parseISO(task.endTime).getTime() <= new Date().getTime() && !task.isDone;
  const hasSubtasks = !!task.subtasks?.length;

  const handleBreakdown = async () => {
    if (isLoading || task.id == null) return;

    const startTime = Date.now();
    let result: Awaited<ReturnType<typeof breakDownTask>> | undefined;

    try {
      result = await breakDownTask(task.id!);

      if (!result || result.isSuccess === false) {
        showBreakdownErrorToast(t("details.failedToRefreshSubtasks"), result?.errorMessage);
        return;
      }

      const subtasks = result.subtasks ?? [];
      if (subtasks.length > 0) {
        await replaceSubtasks({
          taskId: task.id,
          subtasks: subtasks.map((subtask: AddSubtaskDTO) => ({ ...subtask })),
        });
        setIsExpanded(true);
      }
    } catch (e) {
      console.error("Breakdown error:", e);
      showBreakdownErrorToast(
        t("details.failedToRefreshSubtasks"),
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      analytics.trackTaskBreakdown({
        success: result?.isSuccess ?? false,
        durationMs: Date.now() - startTime,
        generatedSubtaskCount: result?.subtasks?.length ?? 0,
      });
    }
  };

  const renderRightActions = (progress: SharedValue<number>) => {
    return (
      <RightActions
        progress={progress}
        taskId={task.id}
        onClose={() => swipeRef.current?.close()}
      />
    );
  };

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={12}
      overshootRight={false}
      friction={2}
      dragOffsetFromLeftEdge={8}
    >
      <View className="flex-col bg-white rounded-2xl px-4 py-3">
        <View className="items-center justify-center">
          <View className="flex-row items-center" style={{ gap: 12 }}>
            {/* Checkbox */}
            <TasksCheckbox
              checked={task.isDone}
              disabled={isLoading}
              onChange={async () => {
                if (isVirtualTask) {
                  completeOccurrence({
                    recurringTaskId: task.recurringTaskId!,
                    occurrenceDate: format(selectedDay!, "yyyy-MM-dd"),
                  });
                  return;
                }
                toggleTask({ taskId: task.id!, selectedDay });
                if (task.alertTime && new Date(task.alertTime) > new Date()) {
                  await cancelNotification({ notificationId: task?.notificationId });
                }
              }}
            />

            {/* Vertical label colour bar */}
            <View className="h-10 w-1.5 rounded-full" style={{ backgroundColor: labelColor }} />

            {/* DDL Tag */}
            {task.isDeadline && (
              <View className="px-1 py-0.5 rounded bg-highlight items-center justify-center">
                <Text className="text-white font-balooBold text-xs mt-0.5">DDL</Text>
              </View>
            )}

            {/* Title + date */}
            <Pressable
              className="flex-1 "
              onPress={() => navigateToTaskDetails(task)}
              disabled={isLoading}
            >
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
                {isRecurringTask && (
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
                {format(parseISO(task.endTime), "H:mm")}
              </Text>

              {hasSubtasks && (
                <Pressable
                  onPress={() => setIsExpanded((v) => !v)}
                  className="ml-2 p-1"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isLoading}
                >
                  <AnimatedChevron color="#9CA3AF" progress={progress} />
                </Pressable>
              )}
            </View>
          </View>
          {hasSubtasks && <SubtaskProgressBar subtasks={task.subtasks} />}
        </View>
        {hasSubtasks && <SubtaskList task={task} progress={progress} />}
      </View>
    </ReanimatedSwipeable>
  );
};

export default CalendarTaskCard;

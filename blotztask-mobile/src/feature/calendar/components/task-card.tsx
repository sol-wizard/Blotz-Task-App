import React, { useState } from "react";
import { View, Pressable, Text, ActivityIndicator, useWindowDimensions } from "react-native";
import TasksCheckbox from "@/feature/task-details/components/task-checkbox";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { formatDateRange } from "../util/format-date-range";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { SubtaskProgressBar } from "./subtask-progress-bar";
import { cancelNotification } from "@/shared/util/cancel-notification";
import { AnimatedChevron } from "@/shared/components/ui/chevron";
import SubtaskList from "./subtask-list";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { useSubtaskMutations } from "@/feature/task-details/hooks/useSubtaskMutations";
import { AddSubtaskDTO } from "@/feature/task-details/models/add-subtask-dto";
import { usePostHog } from "posthog-react-native";
import { EVENTS } from "@/shared/constants/posthog-events";
import { theme } from "@/shared/constants/theme";

const rubberBand = (x: number, limit: number) => {
  "worklet";
  if (x >= 0) return 0;
  if (x < limit) {
    const extra = x - limit;
    return limit + extra * 0.25;
  }

  return x;
};

interface TaskCardProps {
  task: TaskDetailDTO;
  deleteTask: (task: TaskDetailDTO) => void;
  isDeleting: boolean;
  selectedDay?: Date;
}

const TaskCard = ({ task, deleteTask, isDeleting, selectedDay }: TaskCardProps) => {
  const { toggleTask, isToggling } = useTaskMutations();
  const { breakDownTask, isBreakingDown, replaceSubtasks, isReplacingSubtasks } =
    useSubtaskMutations();
  const posthog = usePostHog();

  const queryClient = useQueryClient();

  const { width: screenWidth } = useWindowDimensions();

  // Swipe-to-delete
  const taskCardTranslateX = useSharedValue(0);

  // Expand / collapse
  const [isExpanded, setIsExpanded] = useState(false);
  // measured full height of subtask content
  const progress = useDerivedValue(() => withTiming(isExpanded ? 1 : 0, { duration: 220 }));

  /* Always allow breakdown / subtask generation */
  const hasSubtasks = !!task.subtasks?.length;

  const widthInfo = React.useMemo(() => {
    const deleteWidth = 56; // w-14
    const breakdownWidth = 128; // w-32
    const spacerWidth = 8; // w-2

    // Structure: [Card] [Spacer] ([Breakdown] [Spacer]) [Delete]
    const totalWidth = spacerWidth + deleteWidth + breakdownWidth + spacerWidth;

    return {
      actionWidth: totalWidth,
      openX: -totalWidth,
      openThreshold: totalWidth * 0.5,
      breakdownWidth,
      deleteWidth,
    };
  }, []);

  const isLoading = isToggling || isDeleting || isBreakingDown || isReplacingSubtasks;

  const navigateToTaskDetails = (t: TaskDetailDTO) => {
    queryClient.setQueryData(["taskId", t.id], t);
    router.push({ pathname: "/(protected)/task-details", params: { taskId: t.id } });
  };

  const handleBreakdown = async () => {
    if (isLoading) return;

    posthog.capture(EVENTS.BREAKDOWN_TASK);

    try {
      const subtasks = (await breakDownTask(task.id)) ?? [];
      if (subtasks.length > 0) {
        await replaceSubtasks({
          taskId: task.id,
          subtasks: subtasks.map((subtask: AddSubtaskDTO) => ({ ...subtask })),
        });
        setIsExpanded(true);
        taskCardTranslateX.value = withTiming(0, { duration: 160 });
      }
    } catch (e) {
      console.error("Breakdown error:", e);
    }
  };

  const pan = Gesture.Pan()
    .enabled(!isLoading)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      taskCardTranslateX.value = rubberBand(e.translationX, widthInfo.openX);
    })
    .onEnd(() => {
      const open = Math.abs(taskCardTranslateX.value) > widthInfo.openThreshold;
      taskCardTranslateX.value = withSpring(open ? widthInfo.openX : 0, {
        damping: 16,
        stiffness: 220,
        mass: 0.9,
      });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: taskCardTranslateX.value }],
  }));

  const leftExtrasStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: taskCardTranslateX.value * 1.25 }],
  }));

  const timePeriod = formatDateRange({
    startTime: task.startTime,
    endTime: task.endTime,
    selectedDay,
  });

  const endDate = task.endTime ? parseISO(task.endTime) : null;
  const isOverdue = !!endDate && endDate.getTime() <= new Date().getTime() && !task.isDone;

  const labelColor = task.label?.color ?? theme.colors.disabled;

  return (
    <Animated.View
      className="mx-4 my-1 overflow-hidden"
      layout={MotionAnimations.layout}
      exiting={MotionAnimations.rightExiting}
      entering={MotionAnimations.upEntering}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle} className="flex-row items-start">
          {/* 1) Card */}
          <View style={{ width: screenWidth - 32 }}>
            <Pressable
              onPress={() => navigateToTaskDetails(task)}
              disabled={isLoading}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <View className="flex-col">
                {/* Header row */}
                <View className={`flex-row items-center p-4 ${isLoading ? "opacity-70" : ""}`}>
                  <Animated.View style={leftExtrasStyle} className="flex-row items-center mr-3">
                    <TasksCheckbox
                      checked={task.isDone}
                      disabled={isLoading}
                      size={32}
                      uncheckedColor="#D1D5DB"
                      onChange={async () => {
                        toggleTask({ taskId: task.id, selectedDay });

                        if (task.alertTime && new Date(task.alertTime) > new Date()) {
                          await cancelNotification({ notificationId: task?.notificationId });
                        }
                      }}
                    />
                    <View
                      className="w-[5px] h-10 rounded-full mx-3"
                      style={{ backgroundColor: labelColor }}
                    />

                    <View className="flex-1 flex-row justify-between items-center">
                      <View className="justify-start pt-0 flex-1">
                        <View className="flex-row items-center">
                          <Text
                            className={`text-xl font-baloo ${
                              task.isDone ? "text-neutral-400 line-through" : "text-black"
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
                        </View>

                        {timePeriod && (
                          <Text className="mt-1 text-[13px] text-neutral-400 font-semibold">
                            {timePeriod}
                          </Text>
                        )}
                      </View>

                      <View className="flex-row items-center">
                        {endDate ? (
                          <Text
                            className={`${
                              isOverdue ? "text-warning" : "text-primary"
                            } font-baloo text-lg`}
                          >
                            {format(endDate, "H:mm")}
                          </Text>
                        ) : null}

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
                  </Animated.View>
                </View>

                {/* Progress bar shown only when collapsed */}
                {hasSubtasks && <SubtaskProgressBar subtasks={task.subtasks} />}

                {/* Subtask list */}
                {hasSubtasks && <SubtaskList task={task} progress={progress} />}
              </View>
            </Pressable>
          </View>

          {/* Breakdown Action */}
          <View className="w-32 mx-3" pointerEvents="auto">
            <Pressable
              onPress={handleBreakdown}
              disabled={isLoading}
              android_ripple={{ color: "#DBEAFE", borderless: false }}
              className={`w-32 h-[62px] rounded-xl bg-blue-500/10 items-center justify-center ${
                isBreakingDown || isReplacingSubtasks ? "opacity-50" : ""
              }`}
            >
              {isBreakingDown || isReplacingSubtasks ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Text className="text-info font-baloo font-semibold text-lg">Breakdown</Text>
              )}
            </Pressable>
          </View>

          {/* 2) Delete action */}
          <View className="w-14" pointerEvents={"auto"}>
            <Pressable
              onPress={async () => {
                if (isLoading) return;
                await deleteTask(task);

                if (task.alertTime && new Date(task.alertTime) > new Date()) {
                  await cancelNotification({ notificationId: task?.notificationId });
                }

                taskCardTranslateX.value = withTiming(0, { duration: 160 });
              }}
              disabled={isLoading}
              android_ripple={{ color: "#FEE2E2", borderless: false }}
              className={`w-14 h-20 rounded-xl bg-red-500/10 items-center justify-center ${
                isDeleting ? "opacity-50" : ""
              }`}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#F56767" />
              ) : (
                <MaterialCommunityIcons name="trash-can-outline" size={24} color="#F56767" />
              )}
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

export default React.memo(TaskCard);

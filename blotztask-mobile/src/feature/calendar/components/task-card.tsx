import React, { useState } from "react";
import { View, Pressable, Text, ActivityIndicator, useWindowDimensions } from "react-native";
import { TaskCheckbox } from "@/shared/components/ui/task-checkbox";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/shared/constants/theme";
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

const ACTION_WIDTH = 208; // ACTION_WIDTH must equal the total width of all action buttons + spacers exposed by the swipe.
// Current sum: Breakdown(128px) + Spacer(4px) + Spacer(4px) + Delete(56px) = 192px.
// Users set 208, which reveals a bit more.
const OPEN_X = -ACTION_WIDTH;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.5;

const rubberBand = (x: number, limit: number) => {
  "worklet";
  if (x >= 0) return 0;
  if (x < limit) {
    const extra = x - limit;
    return limit + extra * 0.25;
  }

  return x;
};
const OPEN_THRESHOLD = ACTION_WIDTH * 0.4;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.5;

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

export default function TaskCard({ task, deleteTask, isDeleting, selectedDay }: TaskCardProps) {
  const { toggleTask, isToggling } = useTaskMutations();
  const { breakDownTask, isBreakingDown } = useSubtaskMutations();

  const queryClient = useQueryClient();

  const { width: screenWidth } = useWindowDimensions();

  // Swipe-to-delete
  const taskCardTranslateX = useSharedValue(0);

  // Expand / collapse
  const [isExpanded, setIsExpanded] = useState(false);
  
  // measured full height of subtask content
  const progress = useDerivedValue(() => withTiming(isExpanded ? 1 : 0, { duration: 220 }));

  const hasSubtasks = !!task.subtasks?.length;
  const isLoading = isToggling || isDeleting || isBreakingDown;

  const navigateToTaskDetails = (t: TaskDetailDTO) => {
    queryClient.setQueryData(["taskId", t.id], t);
    router.push({ pathname: "/(protected)/task-details", params: { taskId: t.id } });
  };

  const pan = Gesture.Pan()
    .enabled(!isLoading)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      taskCardTranslateX.value = rubberBand(e.translationX, OPEN_X);
    })
    .onEnd(() => {
      const open = Math.abs(taskCardTranslateX.value) > OPEN_THRESHOLD;
      taskCardTranslateX.value = withSpring(open ? OPEN_X : 0, {
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

  return (
    <Animated.View
      className="mx-4 my-2 overflow-hidden"
      layout={MotionAnimations.layout}
      exiting={MotionAnimations.rightExiting}
    >
    <View className="relative mx-4 my-2 overflow-visible">
      {/* Right action area with delete button */}
      <Animated.View
        style={[
          rightActionStyle,
          { flexDirection: "row", height: titleHeight || undefined },
        ]}
        style={[
          rightActionStyle,
          { flexDirection: "row", height: titleHeight || undefined },
        ]}
        pointerEvents={actionsEnabled ? "auto" : "none"}
        className="absolute right-0 top-0 w-[180px] z-10"
        className="absolute right-0 top-0 w-[180px] z-10"
      >
        {/* Breakdown Task */}
        <Pressable
          onPress={() => {
            if (isLoading) return;
            // TODO: Implement breakdown functionality
          }}
          disabled={isLoading}
          android_ripple={{ color: "#FEE2E2", borderless: false }}
          android_ripple={{ color: "#FEE2E2", borderless: false }}
          className="w-[120px] bg-[#EEF2FF] items-center justify-center rounded-2xl mx-2"
        >
          <Text className="text-info font-baloo font-semibold text-lg">Breakdown</Text>
          <Text className="text-info font-baloo font-semibold text-lg">Breakdown</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            if (isLoading) return;
            await deleteTask(task);
            if (task.alertTime && new Date(task.alertTime) > new Date())
              await cancelNotification({
                notificationId: task?.notificationId,
              });
            translateX.value = withTiming(0);
            runOnJS(setActionsEnabled)(false);
          }}
          disabled={isLoading}
          android_ripple={{ color: "#FEE2E2", borderless: false }}
          className={`w-[56px] rounded-2xl bg-[#F56767]/10 items-center justify-center ${
            isDeleting ? "opacity-50" : ""
          }`}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <MaterialCommunityIcons name="trash-can-outline" size={24} color="#EF4444" />
          )}
        </Pressable>
      </Animated.View>

    <Animated.View
      className="mx-4 my-2 overflow-hidden"
      layout={MotionAnimations.layout}
      exiting={MotionAnimations.rightExiting}
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
                <View className={`flex-row items-center p-5 ${isLoading ? "opacity-70" : ""}`}>
                  <Animated.View style={leftExtrasStyle} className="flex-row items-center mr-3">
                    <TaskCheckbox
                      checked={task.isDone}
                      onPress={async () => {
                        toggleTask({ taskId: task.id, selectedDay });
                        if (task.alertTime && new Date(task.alertTime) > new Date()) {
                          await cancelNotification({ notificationId: task?.notificationId });
                        }
                      }}
                      disabled={isLoading}
                      haptic={!task.isDone}
                      size={32}
                    />
        <Animated.View style={cardStyle} className="bg-white rounded-2xl">
          <Pressable onPress={() => navigateToTaskDetails(task)} disabled={isLoading}>
            <View className="flex-col">
              <View
                className={`flex-row items-center p-5 ${isLoading ? "opacity-70" : ""}`}
                onLayout={(event: LayoutChangeEvent) => {
                  const { height } = event.nativeEvent.layout;
                  setTitleHeight(height);
                }}
              >
                <Animated.View style={leftExtrasStyle} className="flex-row items-center mr-3">
                  <TaskCheckbox
                    checked={task.isDone}
                    onPress={async () => {
                      toggleTask({ taskId: task.id, selectedDay });
                      if (task.alertTime && new Date(task.alertTime) > new Date())
                        await cancelNotification({
                          notificationId: task?.notificationId,
                        });
                    }}
                    disabled={isLoading}
                    haptic={!task.isDone}
                    size={32}
                  />
                      }}
                      disabled={isLoading}
                      haptic={!task.isDone}
                      size={32}
                    />
        <Animated.View style={cardStyle} className="bg-white rounded-2xl">
          <Pressable onPress={() => navigateToTaskDetails(task)} disabled={isLoading}>
            <View className="flex-col">
              <View
                className={`flex-row items-center p-5 ${isLoading ? "opacity-70" : ""}`}
                onLayout={(event: LayoutChangeEvent) => {
                  const { height } = event.nativeEvent.layout;
                  setTitleHeight(height);
                }}
              >
                <Animated.View style={leftExtrasStyle} className="flex-row items-center mr-3">
                  <TaskCheckbox
                    checked={task.isDone}
                    onPress={async () => {
                      toggleTask({ taskId: task.id, selectedDay });
                      if (task.alertTime && new Date(task.alertTime) > new Date())
                        await cancelNotification({
                          notificationId: task?.notificationId,
                        });
                    }}
                    disabled={isLoading}
                    haptic={!task.isDone}
                    size={32}
                  />
                      }}
                      disabled={isLoading}
                      haptic={!task.isDone}
                      size={32}
                    />

                    <View
                      className="w-[6px] h-[30px] rounded-[3px] mr-3"
                      style={{ backgroundColor: task.label?.color ?? theme.colors.disabled }}
                    />
                  </Animated.View>

                  <View className="flex-1 flex-row justify-between items-center">
                    <View className="justify-start pt-0 flex-1">
                      <View className="flex-row items-center">
                        <Text
                          className={`text-xl font-baloo ${
                            task.isDone ? "text-neutral-400 line-through" : "text-black"
                          }`}
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
                </View>

                {/* Progress bar shown only when collapsed */}
                {hasSubtasks && <SubtaskProgressBar subtasks={task.subtasks} />}

                {/* Subtask list */}
                {hasSubtasks && <SubtaskList task={task} progress={progress} />}
              </View>
            </Pressable>
          </View>

          <View className="w-3" />

          {/* 2) Actions */}
          {/* Breakdown Action */}
          <View className="w-32" pointerEvents={"auto"}>
            <Pressable
              onPress={async () => {
                if (isLoading) return;
                try {
                  await breakDownTask(task.id);
                  setIsExpanded(true);
                  taskCardTranslateX.value = withTiming(0);
                } catch (e) {
                  // Error handled in hook
                }
              }}
              disabled={isLoading}
              android_ripple={{ color: "#FEE2E2", borderless: false }}
              className={`w-32 h-20 rounded-xl bg-indigo-50 items-center justify-center ${
                isLoading ? "opacity-50" : ""
              }`}
            >
              {isBreakingDown ? (
                <ActivityIndicator size="small" color="#9CA3AF" />
              ) : (
                <Text className="text-info font-baloo font-bold text-lg">Breakdown</Text>
              )}
            </Pressable>
          </View>

          <View className="w-3" />

          {/* Delete action */}
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
}
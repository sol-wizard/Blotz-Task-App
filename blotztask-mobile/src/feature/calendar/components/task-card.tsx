import React, { useState } from "react";
import { View, Pressable, Text, ActivityIndicator } from "react-native";
import { TaskCheckbox } from "@/shared/components/ui/task-checkbox";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/shared/constants/theme";
import { format, isSameDay, parseISO } from "date-fns";
import { formatDateRange } from "../util/format-date-range";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { SubtaskProgressBar } from "./subtask-progress-bar";

const ACTION_WIDTH = 64;
const OPEN_X = -ACTION_WIDTH;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.55;

interface TaskCardProps {
  task: TaskDetailDTO;
  deleteTask: (id: number) => Promise<void>;
  isDeleting: boolean;
  selectedDay: Date;
}

export default function TaskCard({ task, deleteTask, isDeleting, selectedDay }: TaskCardProps) {
  const { toggleTask, isToggling } = useTaskMutations();
  const queryClient = useQueryClient();

  const navigateToTaskDetails = (task: TaskDetailDTO) => {
    queryClient.setQueryData(["taskId", task.id], task);
    router.push({
      pathname: "/(protected)/task-details",
      params: { taskId: task.id },
    });
  };

  const [actionsEnabled, setActionsEnabled] = useState(false);

  // negative value indicates left swipe
  const translateX = useSharedValue(0);

  // Disable interactions when loading
  const isLoading = isToggling || isDeleting;

  const dividerColor = task.label?.color ?? theme.colors.disabled;

  // Gesture: only allow left swipe, snap to 0 or OPEN_X on release
  const pan = Gesture.Pan()
    .enabled(!isLoading)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(OPEN_X, e.translationX);
      } else {
        translateX.value = 0;
      }
    })
    .onEnd(() => {
      const open = Math.abs(translateX.value) > OPEN_THRESHOLD;
      translateX.value = withTiming(open ? OPEN_X : 0, { duration: 160 });
      runOnJS(setActionsEnabled)(open);
    });

  // Content layer follows gesture movement
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Right action area follows gesture movement
  const rightActionStyle = useAnimatedStyle(() => {
    const progress = interpolate(-translateX.value, [0, ACTION_WIDTH], [0, 1], Extrapolation.CLAMP);
    return {
      transform: [{ translateX: interpolate(progress, [0, 1], [ACTION_WIDTH, 0]) }],
      opacity: progress,
    };
  });

  // Dividing line is visible and hidden with the action area
  const dividerStyle = useAnimatedStyle(() => {
    const progress = interpolate(-translateX.value, [0, ACTION_WIDTH], [0, 1], Extrapolation.CLAMP);
    return { opacity: progress };
  });

  // Create a sense of being pushed away
  const leftExtrasStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 1.25 }],
  }));

  const timePeriod = formatDateRange({
    startTime: task.startTime,
    endTime: task.endTime,
    selectedDay,
  });

  const endDate = task.endTime ? parseISO(task.endTime) : null;

  const isOverdue = !!endDate && endDate.getTime() <= new Date().getTime() && !task.isDone;

  return (
    <View className="relative mx-4 my-2 rounded-2xl bg-white overflow-hidden">
      {/* Right action area with delete button */}
      <Animated.View
        style={rightActionStyle}
        pointerEvents={actionsEnabled ? "auto" : "none"}
        className="absolute right-0 top-0 bottom-0 w-[64px] flex-row items-center justify-start z-10 px-2"
      >
        <Animated.View
          pointerEvents="none"
          style={dividerStyle}
          className="w-[6px] h-[30px] bg-neutral-300 rounded-[3px] mr-1.5"
        />

        <Pressable
          onPress={async () => {
            if (isLoading) return;
            await deleteTask(task.id);
            translateX.value = withTiming(0);
            runOnJS(setActionsEnabled)(false);
          }}
          disabled={isLoading}
          android_ripple={{ color: "#e5e7eb", borderless: true }}
          className={`w-[30px] h-[30px] rounded-full border-2 border-neutral-300 items-center justify-center ${
            isDeleting ? "opacity-50" : ""
          }`}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <MaterialCommunityIcons name="trash-can-outline" size={22} color="#6B7280" />
          )}
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle} className="bg-white rounded-2xl">
          <Pressable onPress={() => navigateToTaskDetails(task)} disabled={isLoading}>
            <View className="flex-col">
              <View className={`flex-row items-center p-5 ${isLoading ? "opacity-70" : ""}`}>
                <Animated.View style={leftExtrasStyle} className="flex-row items-center mr-3">
                  <TaskCheckbox
                    checked={task.isDone}
                    onPress={() => toggleTask(task.id)}
                    disabled={isLoading}
                    haptic={!task.isDone}
                  />

                  <View
                    className="w-[6px] h-[30px] rounded-[3px] mr-3"
                    style={{ backgroundColor: dividerColor }}
                  />
                </Animated.View>

                <View className="flex-1 flex-row justify-between items-center">
                  <View className="justify-start pt-0">
                    <Text
                      className={`text-xl font-baloo w-60 ${task.isDone ? "text-neutral-400 line-through" : "text-black"}`}
                    >
                      {task.title}
                    </Text>
                    {timePeriod && (
                      <Text className="mt-1 text-[13px] text-neutral-400 font-semibold">
                        {timePeriod}
                      </Text>
                    )}
                  </View>

                  {endDate ? (
                    <Text
                      className={`${isOverdue ? "text-warning" : "text-primary"} font-baloo text-lg`}
                    >
                      {format(endDate, "H:mm")}
                    </Text>
                  ) : null}
                </View>
              </View>

              <SubtaskProgressBar subtasks={task.subtasks} />
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

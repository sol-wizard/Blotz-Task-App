import React, { useState } from "react";
import { View, Pressable, Text, ActivityIndicator, useWindowDimensions } from "react-native";
import { TaskCheckbox } from "@/shared/components/ui/task-checkbox";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { theme } from "@/shared/constants/theme";
import { format, parseISO } from "date-fns";
import { formatDateRange } from "../util/format-date-range";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { SubtaskProgressBar } from "./subtask-progress-bar";
import { useSubtaskMutations } from "@/feature/task-details/hooks/useSubtaskMutations";
import { SubtaskDTO } from "@/feature/task-details/models/subtask-dto";
import { convertDurationToText } from "@/shared/util/convert-duration";
import { cancelNotification } from "@/shared/util/cancel-notification";

const ACTION_WIDTH = 64;
const OPEN_X = -ACTION_WIDTH;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.5;

interface TaskCardProps {
  task: TaskDetailDTO;
  deleteTask: (task: TaskDetailDTO) => void;
  isDeleting: boolean;
  selectedDay?: Date;
}

export default function TaskCard({ task, deleteTask, isDeleting, selectedDay }: TaskCardProps) {
  const { toggleTask, isToggling } = useTaskMutations();
  const { toggleSubtaskStatus, isTogglingSubtaskStatus } = useSubtaskMutations();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  const handleToggleSubtask = async (subtaskId: number) => {
    await toggleSubtaskStatus({ subtaskId, parentTaskId: task.id });
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

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
    <View className="mx-4 my-2 overflow-hidden">
      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle} className="flex-row items-start">
          {/* 1. Task Card */}
          <View style={{ width: screenWidth - 32 }}>
            <Pressable
              onPress={() => navigateToTaskDetails(task)}
              disabled={isLoading}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <View className="flex-col">
                <View className={`flex-row items-center p-5 ${isLoading ? "opacity-70" : ""}`}>
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

                    <View
                      className="w-[6px] h-[30px] rounded-[3px] mr-3"
                      style={{ backgroundColor: dividerColor }}
                    />
                  </Animated.View>

                  <View className="flex-1 flex-row justify-between items-center">
                    <View className="justify-start pt-0 flex-1">
                      <View className="flex-row items-center">
                        <Text
                          className={`text-xl font-baloo ${task.isDone ? "text-neutral-400 line-through" : "text-black"}`}
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
                          className={`${isOverdue ? "text-warning" : "text-primary"} font-baloo text-lg`}
                        >
                          {format(endDate, "H:mm")}
                        </Text>
                      ) : null}
                      {hasSubtasks && (
                        <Pressable
                          onPress={toggleExpand}
                          className="ml-2 p-1"
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <MaterialIcons
                            name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                            size={24}
                            color="#9CA3AF"
                          />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>

                {!isExpanded && <SubtaskProgressBar subtasks={task.subtasks} />}

                {/* Expanded Subtask List */}
                {isExpanded && hasSubtasks && (
                  <View className="px-5 pb-4">
                    {task.subtasks?.map((subtask: SubtaskDTO) => (
                      <Pressable
                        key={subtask.subTaskId}
                        onPress={() => handleToggleSubtask(subtask.subTaskId)}
                        disabled={isTogglingSubtaskStatus}
                        className={`flex-row items-center py-2 ${isTogglingSubtaskStatus ? "opacity-50" : ""}`}
                      >
                        <View
                          className={`w-6 h-6 rounded-lg mr-3 items-center justify-center border-2 ${
                            subtask.isDone
                              ? "bg-[#4CAF50] border-[#4CAF50]"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {subtask.isDone && <MaterialIcons name="check" size={16} color="white" />}
                        </View>
                        <Text
                          className={`flex-1 text-base font-baloo ${
                            subtask.isDone
                              ? "text-gray-400 line-through opacity-60"
                              : "text-gray-700"
                          }`}
                        >
                          {subtask.title}
                        </Text>
                        {subtask.duration && (
                          <Text className="text-sm text-gray-400 font-baloo ml-2">
                            {convertDurationToText(subtask.duration)}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </Pressable>
          </View>

          <View className="w-2" />

          {/* 3 Delete Button */}
          <View className="w-14" pointerEvents={actionsEnabled ? "auto" : "none"}>
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
    </View>
  );
}

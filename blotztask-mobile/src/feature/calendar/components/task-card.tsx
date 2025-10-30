import React, { useEffect, useState } from "react";
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
import { format, parseISO } from "date-fns";
import { formatDateRange } from "../util/format-date-range";
import useTaskMutations from "@/shared/hooks/useTaskMutations";

const ACTION_WIDTH = 64;
const OPEN_X = -ACTION_WIDTH;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.55;

interface TaskCardProps {
  id: number;
  title: string;
  startTime?: string;
  endTime?: string;
  isCompleted: boolean;
  labelColor?: string;
  onPress?: () => void;
}

export default function TaskCard({
  id,
  title,
  startTime,
  endTime,
  isCompleted,
  labelColor,
  onPress,
}: TaskCardProps) {
  const { toggleTask, deleteTask, isToggling, isDeleting } = useTaskMutations();

  const [actionsEnabled, setActionsEnabled] = useState(false);

  // negative value indicates left swipe
  const translateX = useSharedValue(0);

  // Disable interactions when loading
  const isLoading = isToggling || isDeleting;

  const dividerColor = labelColor ?? theme.colors.disabled;

  // Gesture: only allow left swipe, snap to 0 or OPEN_X on release
  const pan = Gesture.Pan()
    .enabled(!isLoading)
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

  const timePeriod = formatDateRange({ startTime, endTime });

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
            if (isDeleting || isLoading) return;
            console.log("Deleting task", id);
            await deleteTask(id);
            console.log("Deleted task", id);
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
          <Pressable onPress={onPress} disabled={isLoading}>
            <View className={`flex-row items-center p-5 ${isLoading ? "opacity-70" : ""}`}>
              <Animated.View style={leftExtrasStyle} className="flex-row items-center mr-3">
                <TaskCheckbox
                  checked={isCompleted}
                  onPress={() => toggleTask(id)}
                  disabled={isLoading}
                />

                <View
                  className="w-[6px] h-[30px] rounded-[3px] mr-3"
                  style={{ backgroundColor: dividerColor }}
                />
              </Animated.View>
              <View className="flex-1 flex-row justify-between items-center">
                <View className="justify-start pt-0">
                  <Text
                    className={`text-xl font-baloo ${isCompleted ? "text-neutral-400 line-through" : "text-black"}`}
                  >
                    {title}
                  </Text>
                  {timePeriod && (
                    <Text className="mt-1 text-[13px] text-neutral-400 font-semibold">
                      {timePeriod}
                    </Text>
                  )}
                </View>

                {endTime && new Date(endTime).getTime() <= new Date().getTime() && !isCompleted && (
                  <Text className="text-warning font-baloo text-lg">Late</Text>
                )}
                {endTime && new Date(endTime).getTime() > new Date().getTime() && (
                  <Text className="text-tertiary font-baloo text-lg">
                    {format(parseISO(endTime), "H:mm")}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

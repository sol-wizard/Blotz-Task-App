import React, { useEffect, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { CustomCheckbox } from "@/shared/components/ui/custom-checkbox";
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

import { format, parseISO } from "date-fns";
import { formatDateRange } from "../util/format-date-range";

interface TaskCardProps {
  id: number;
  title: string;
  startTime?: string;
  endTime?: string;
  isCompleted?: boolean;
  onToggleComplete?: (id: number, completed: boolean) => void;
  onPress?: () => void;
  onDelete?: (id: number) => Promise<void> | void;
}

const ACTION_WIDTH = 64;
const OPEN_X = -ACTION_WIDTH;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.55;

export default function TaskCard({
  id,
  title,
  startTime,
  endTime,
  isCompleted = false,
  onToggleComplete,
  onPress,
  onDelete,
}: TaskCardProps) {
  const [checked, setChecked] = useState(isCompleted);

  // only allow right action when sliding open
  const [actionsEnabled, setActionsEnabled] = useState(false);

  // negative value indicates left swipe
  const translateX = useSharedValue(0);

  useEffect(() => {
    setChecked(isCompleted);
  }, [isCompleted]);

  // Gesture: only allow left swipe, snap to 0 or OPEN_X on release
  const pan = Gesture.Pan()
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

  const handleToggleComplete = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    onToggleComplete?.(id, newChecked);
  };

  const timePeriod = formatDateRange({ startTime, endTime });

  return (
    <View className="relative mx-4 my-2 rounded-2xl bg-white overflow-hidden">
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
            if (!onDelete) return;
            await onDelete(id);
            translateX.value = withTiming(0);
            runOnJS(setActionsEnabled)(false);
          }}
          android_ripple={{ color: "#e5e7eb", borderless: true }}
          className="w-[30px] h-[30px] rounded-full border-2 border-neutral-300 items-center justify-center"
        >
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="#6B7280" />
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle} className="bg-white rounded-2xl">
          <Pressable onPress={onPress}>
            <View className="flex-row items-center p-5">
              <Animated.View style={leftExtrasStyle} className="flex-row items-center mr-3">
                <CustomCheckbox checked={checked} onPress={handleToggleComplete} />

                <View className="w-[6px] h-[30px] bg-neutral-300 rounded-[3px] mr-3" />
              </Animated.View>
              <View className="flex-1 flex-row justify-between items-center">
                <View className="justify-start pt-0">
                  <Text
                    className={`text-xl font-baloo ${checked ? "text-neutral-400 line-through" : "text-black"}`}
                  >
                    {title}
                  </Text>
                  {timePeriod && (
                    <Text className="mt-1 text-[13px] text-neutral-400 font-semibold">
                      {timePeriod}
                    </Text>
                  )}
                </View>
                {endTime && new Date(endTime).getTime() <= new Date().getTime() && !checked && (
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

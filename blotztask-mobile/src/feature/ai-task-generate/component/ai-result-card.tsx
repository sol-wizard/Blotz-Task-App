import React from "react";
import { View, Text, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/shared/constants/theme";
import { LabelDTO } from "@/shared/models/label-dto";
import { formatAiTaskCardDate, formatAiTaskCardTime } from "../utils/format-ai-task-card-time";

type Props = {
  id: string;
  text: string;
  onDelete: (id: string) => void;
  label?: LabelDTO;
  startTime?: string;
  endTime?: string;
};

export function AiResultCard({ id, text, onDelete, label, startTime, endTime }: Props) {
  const isTask = startTime !== undefined;
  const formatTime = isTask ? formatAiTaskCardTime({ startTime: startTime!, endTime: endTime! }) : null;
  const formatDate = isTask ? formatAiTaskCardDate({ startTime: startTime!, endTime: endTime! }) : null;

  return (
    <Animated.View
      entering={MotionAnimations.upEntering}
      exiting={MotionAnimations.outExiting}
      layout={MotionAnimations.layout}
      className="bg-white rounded-2xl flex-row items-center shadow-md w-[88%] min-h-20 justify-between pr-3 ml-7 mt-4 mb-4 py-4 pl-6 mx-4"
    >
      {isTask && (
        <View
          className="w-2 h-full rounded-full"
          style={{ backgroundColor: label?.color ?? theme.colors.disabled }}
        />
      )}

      <View className="flex-1 flex-row items-center ml-4">
        <Text
          className="flex-1 mr-3 text-lg font-baloo leading-5"
          style={{ color: theme.colors.onSurface }}
        >
          {text}
        </Text>

        {isTask && (
          <View className="items-center ml-2 flex-shrink-0">
            {formatTime ? (
              <Text className="text-sm font-balooThin ml-1 text-primary">{formatTime}</Text>
            ) : null}
            {formatDate ? (
              <Text className="text-sm font-balooThin ml-1 text-primary">{formatDate}</Text>
            ) : null}
          </View>
        )}
      </View>

      <Pressable
        onPress={() => onDelete(id)}
        hitSlop={10}
        className="justify-center w-8 h-8 rounded-full ml-3"
        android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: false }}
      >
        <MaterialCommunityIcons name="close" size={20} color="#2F3640" />
      </Pressable>
    </Animated.View>
  );
}

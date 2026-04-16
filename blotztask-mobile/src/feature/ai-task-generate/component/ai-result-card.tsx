import React from "react";
import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { theme } from "@/shared/constants/theme";
import { LabelDTO } from "@/shared/models/label-dto";
import { formatAiTaskCardDate, formatAiTaskCardTime } from "../utils/format-ai-task-card-time";

type Props = {
  text: string;
  label?: LabelDTO;
  startTime?: string;
  endTime?: string;
};

export function AiResultCard({ text, label, startTime, endTime }: Props) {
  const isTask = startTime !== undefined;
  const formatTime = isTask
    ? formatAiTaskCardTime({ startTime: startTime!, endTime: endTime! })
    : null;
  const formatDate = isTask
    ? formatAiTaskCardDate({ startTime: startTime!, endTime: endTime! })
    : null;

  return (
    <Animated.View
      entering={MotionAnimations.upEntering}
      exiting={MotionAnimations.outExiting}
      layout={MotionAnimations.layout}
      className="bg-white rounded-2xl flex-row items-center shadow-md w-[88%] justify-between pl-6 pr-4 pt-4 pb-3 my-4"
    >
      {isTask && (
        <View
          className="w-1.5 h-10 rounded-full"
          style={{ backgroundColor: label?.color ?? theme.colors.disabled }}
        />
      )}

      <View className="flex-1 flex-row items-center ml-4">
        <Text
          className="flex-1 text-lg font-baloo leading-5 py-2"
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

    </Animated.View>
  );
}

import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { SubtaskDTO } from "@/feature/task-details/models/subtask-dto";

type SubtaskProgressBarProps = {
  subtasks?: SubtaskDTO[];
};

function Segment({ filled }: { filled: boolean }) {
  const widthProgress = useSharedValue(filled ? 100 : 0);

  useEffect(() => {
    widthProgress.value = withTiming(filled ? 100 : 0, { duration: 220 });
  }, [filled, widthProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthProgress.value}%`,
  }));

  return (
    <View className="flex-1 h-full rounded-lg overflow-hidden bg-[#E9F5E9]">
      <Animated.View className="h-full bg-[#84CC16]" style={fillStyle} />
    </View>
  );
}

export const SubtaskProgressBar = ({ subtasks }: SubtaskProgressBarProps) => {
  if (!subtasks || subtasks.length === 0) return null;

  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.isDone).length;

  return (
    <View className="flex-row gap-[6px] h-[6px] mb-2 mx-6">
      {Array.from({ length: total }).map((_, index) => (
        <Segment key={index} filled={index < completed} />
      ))}
    </View>
  );
};

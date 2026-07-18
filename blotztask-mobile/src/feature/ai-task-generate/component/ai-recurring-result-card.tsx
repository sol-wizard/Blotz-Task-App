import React from "react";
import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { theme } from "@/shared/constants/theme";
import { LabelDTO } from "@/shared/models/label-dto";

// SPIKE (#1462, throwaway): draft card for an AI-extracted recurring task. Mirrors AiResultCard's
// container, but stacks the title over a schedule summary (e.g. "Weekly · Mon, Wed, Fri · 7:00 AM")
// instead of a one-off time, so multi-day patterns the manual UI can't show are visible here.
type Props = {
  title: string;
  label?: LabelDTO;
  scheduleSummary: string;
};

export function AiRecurringResultCard({ title, label, scheduleSummary }: Props) {
  return (
    <Animated.View
      entering={MotionAnimations.upEntering}
      exiting={MotionAnimations.outExiting}
      layout={MotionAnimations.layout}
      className="bg-white rounded-2xl flex-row items-center w-[88%] pl-6 pr-4 pt-4 pb-3 my-4"
    >
      <View
        className="w-1.5 h-10 rounded-full"
        style={{ backgroundColor: label?.color ?? theme.colors.disabled }}
      />

      <View className="flex-1 ml-4">
        <Text className="text-lg font-baloo leading-5 py-1" style={{ color: theme.colors.onSurface }}>
          {title}
        </Text>
        <Text className="text-sm font-balooThin text-primary mt-0.5">{scheduleSummary}</Text>
      </View>
    </Animated.View>
  );
}

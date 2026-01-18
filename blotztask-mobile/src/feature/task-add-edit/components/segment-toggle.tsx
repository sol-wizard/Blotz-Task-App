import React from "react";
import { Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { SegmentButtonValue } from "../models/segment-button-value";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";

type Props = {
  value: SegmentButtonValue;
  setValue: (next: SegmentButtonValue) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SegmentToggle({ value, setValue }: Props) {
  const { t } = useTranslation("tasks");
  const tabPositionX = useSharedValue(0);

  const onTabMovingAnimation = (index: number) => {
    tabPositionX.value = withTiming(104 * index, {});
  };

  const tabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabPositionX.value }],
  }));

  return (
    <Animated.View
      className="flex-row bg-[#F4F6FA] p-1 rounded-xl mb-6 w-56 items-center"
      layout={MotionAnimations.layout}
    >
      <Animated.View
        className="absolute bg-white rounded-xl w-28 h-10 shadow-sm shadow-gray-400"
        style={tabAnimatedStyle}
      />
      <AnimatedPressable
        className={`flex-1 justify-center items-center py-2 px-3 rounded-xl `}
        onPress={() => {
          setValue("reminder");
          onTabMovingAnimation(0);
        }}
      >
        <Text
          className={`text-[15px] font-semibold ${
            value === "reminder" ? "text-[#1A2433]" : "text-[#6B768A]"
          }`}
        >
          {t("form.reminder")}
        </Text>
      </AnimatedPressable>

      {/* Event tab */}
      <AnimatedPressable
        className={`flex-1 justify-center items-center py-2 px-3 rounded-xl`}
        onPress={() => {
          setValue("event");
          onTabMovingAnimation(1);
        }}
      >
        <Text
          className={`text-[15px] font-semibold ${
            value === "event" ? "text-[#1A2433]" : "text-[#6B768A]"
          }`}
        >
          {t("form.event")}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

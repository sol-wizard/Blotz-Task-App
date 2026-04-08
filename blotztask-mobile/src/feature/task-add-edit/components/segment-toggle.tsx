import React, { useCallback } from "react";
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
  const tabPositionX = useSharedValue(value === "reminder" ? 0 : 224 / 2);
  const [containerWidth, setContainerWidth] = React.useState(224);
  const isInitialMount = React.useRef(true);
  const onTabMovingAnimation = useCallback((index: number, animate: boolean = true) => {
    const tabWidth = containerWidth / 2;
    const target = tabWidth * index;
    tabPositionX.value = animate ? withTiming(target, { duration: 200 }) : target;
  }, [containerWidth, tabPositionX]);

  React.useEffect(() => {
    if (containerWidth > 0) {
      onTabMovingAnimation(value === "reminder" ? 0 : 1, !isInitialMount.current);
      isInitialMount.current = false;
    }
  }, [containerWidth, onTabMovingAnimation, value]);

  const tabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabPositionX.value }],
  }));
  return (
    <Animated.View
      className="flex-row bg-[#F4F6FA] p-1 rounded-xl mb-6 w-56 items-center"
      layout={MotionAnimations.layout}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        className="absolute bg-white rounded-xl h-10 shadow-sm shadow-gray-400"
        style={[
          tabAnimatedStyle,
        {
          width: containerWidth / 2,
        },
      ]}
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

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
  // 200 and 4 mirror `max-w-[200px]` and `p-1` on the container below — change both together.
  const [containerWidth, setContainerWidth] = React.useState(200);
  const tabWidth = (containerWidth - 4 * 2) / 2;
  const tabPositionX = useSharedValue(value === SegmentButtonValue.Reminder ? 0 : tabWidth);
  const isInitialMount = React.useRef(true);
  React.useEffect(() => {
    if (containerWidth > 0) {
      onTabMovingAnimation(value === SegmentButtonValue.Reminder ? 0 : 1, !isInitialMount.current);
      isInitialMount.current = false;
    }
  }, [value, containerWidth]);

  const onTabMovingAnimation = (index: number, animate: boolean = true) => {
    const target = tabWidth * index;
    tabPositionX.value = animate ? withTiming(target, { duration: 200 }) : target;
  };

  const tabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabPositionX.value }],
  }));

  return (
    <Animated.View
      className="flex-row bg-[#F4F6FA] p-1 rounded-xl mb-6 w-full max-w-[200px] items-center"
      layout={MotionAnimations.layout}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        className="absolute bg-white rounded-xl h-10 shadow-sm shadow-gray-400"
        style={[tabAnimatedStyle, { width: tabWidth, left: 4 }]}
      />
      <AnimatedPressable
        className={`flex-1 justify-center items-center py-2 px-2 rounded-xl `}
        onPress={() => {
          setValue(SegmentButtonValue.Reminder);
          onTabMovingAnimation(0);
        }}
      >
        <Text
          numberOfLines={1}
          className={`text-[15px] font-semibold ${
            value === SegmentButtonValue.Reminder ? "text-[#1A2433]" : "text-[#6B768A]"
          }`}
        >
          {t("form.reminder")}
        </Text>
      </AnimatedPressable>

      {/* Event tab */}
      <AnimatedPressable
        className={`flex-1 justify-center items-center py-2 px-2 rounded-xl`}
        onPress={() => {
          setValue(SegmentButtonValue.Event);
          onTabMovingAnimation(1);
        }}
      >
        <Text
          numberOfLines={1}
          className={`text-[15px] font-semibold ${
            value === SegmentButtonValue.Event ? "text-[#1A2433]" : "text-[#6B768A]"
          }`}
        >
          {t("form.event")}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

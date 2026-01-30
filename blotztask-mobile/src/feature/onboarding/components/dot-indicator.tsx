import React, { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type DotIndicatorProps = {
  isActive: boolean;
  isLast: boolean;
};

export function DotIndicator({ isActive, isLast }: DotIndicatorProps) {
  const width = useSharedValue(isActive ? 24 : 8);

  useEffect(() => {
    width.value = withTiming(isActive ? 24 : 8, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: isActive ? "#000000" : "#D1D1D1",
          marginRight: isLast ? 0 : 8,
        },
        animatedStyle,
      ]}
    />
  );
}

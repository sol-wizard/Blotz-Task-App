import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";

export function Hanging({
  active,
  children,
  style,
}: {
  active: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const a = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(a, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();
  }, [active, a]);

  const animatedStyle = {
    transform: [
      { rotateZ: a.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-6deg"] }) },
      { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) },
      { scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) },
    ],
  } as const;

  return (
    <Animated.View
      style={[
        {
          elevation: active ? 6 : 2,
        },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

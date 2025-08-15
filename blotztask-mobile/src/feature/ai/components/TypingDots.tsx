import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

type Props = { size?: number; gap?: number; duration?: number; color?: string };

export default function TypingDots({ size = 6, gap = 6, duration = 900, color = "#9CA3AF" }: Props) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: duration / 3, useNativeDriver: true }),
        Animated.timing(a, { toValue: 2, duration: duration / 3, useNativeDriver: true }),
        Animated.timing(a, { toValue: 3, duration: duration / 3, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [a, duration]);

  const dot = (i: number) => ({
    opacity: a.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: [i === 0 ? 1 : 0.35, i === 1 ? 1 : 0.35, i === 2 ? 1 : 0.35, 0.35],
    }),
    width: size,
    height: size,
    borderRadius: size / 2,
    marginHorizontal: gap / 2,
    backgroundColor: color,
  });

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Animated.View style={dot(0)} />
      <Animated.View style={dot(1)} />
      <Animated.View style={dot(2)} />
    </View>
  );
}

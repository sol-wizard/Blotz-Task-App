import React, { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  withRepeat,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type VoiceLevelAnimationProps = {
  level?: number;
  bars?: number;
  color?: string;
  height?: number;
  width?: number | `${number}%`;
  style?: ViewStyle;
};

const DEFAULT_BAR_COUNT = 30;
const DEFAULT_HEIGHT = 32;
const MIN_BAR_HEIGHT = 4;
const MAX_LEVEL = 1;
const BAR_WIDTH = 2;
const IDLE_WAVE_STRENGTH = 0.18;
const MIN_METERING_DB = -60;
const MAX_METERING_DB = 0;

const clampLevel = (level: number) => {
  "worklet";
  return Math.min(Math.max(level, 0), MAX_LEVEL);
};

const normalizeMicLevel = (metering: number | undefined) => {
  "worklet";
  if (metering === undefined) {
    return 0;
  }

  const clampedMetering = Math.min(Math.max(metering, MIN_METERING_DB), MAX_METERING_DB);
  return (clampedMetering - MIN_METERING_DB) / (MAX_METERING_DB - MIN_METERING_DB);
};

const VoiceLevelBar = ({
  index,
  count,
  height,
  level,
  motionPhase,
  color,
}: {
  index: number;
  count: number;
  height: number;
  level: SharedValue<number>;
  motionPhase: SharedValue<number>;
  color: string;
}) => {
  const center = (count - 1) / 2;
  const distanceFromCenter = Math.abs(index - center);
  const emphasis = 1 - distanceFromCenter / Math.max(center, 1);
  const phaseOffset = ((index * 1.73) % Math.PI) + index * 0.31;
  const driftSpeed = 0.85 + (index % 5) * 0.18;
  const driftAmount = 0.12 + (index % 4) * 0.035;

  const animatedStyle = useAnimatedStyle(() => {
    const boostedLevel = Math.pow(clampLevel(level.value), 0.65);
    const drift = (Math.sin(motionPhase.value * driftSpeed + phaseOffset) + 1) / 2;
    const idleWave = drift * IDLE_WAVE_STRENGTH;
    const randomizedLevel = clampLevel(
      idleWave + boostedLevel * (0.78 + emphasis * 0.22) + drift * driftAmount * boostedLevel,
    );
    const voiceHeight = interpolate(
      randomizedLevel,
      [0, 1],
      [MIN_BAR_HEIGHT + emphasis * 2, height],
    );

    return {
      height: voiceHeight,
      opacity: 1,
      backgroundColor: color,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: BAR_WIDTH,
          borderRadius: 999,
        },
        animatedStyle,
      ]}
    />
  );
};

const VoiceLevelAnimation = ({
  level,
  bars = DEFAULT_BAR_COUNT,
  color = "#FFFFFF",
  height = DEFAULT_HEIGHT,
  width = "100%",
  style,
}: VoiceLevelAnimationProps) => {
  const animatedLevel = useSharedValue(clampLevel(normalizeMicLevel(level)));
  const motionPhase = useSharedValue(0);
  const barCount = Math.max(3, bars);

  useEffect(() => {
    animatedLevel.value = withTiming(clampLevel(normalizeMicLevel(level)), {
      duration: 35,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedLevel, level]);

  useEffect(() => {
    motionPhase.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: 520,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [motionPhase]);

  return (
    <View
      pointerEvents="none"
      style={[
        {
          width,
          height,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          columnGap: 4,
        },
        style,
      ]}
    >
      {Array.from({ length: barCount }, (_, index) => (
        <VoiceLevelBar
          key={index}
          index={index}
          count={barCount}
          height={height}
          level={animatedLevel}
          motionPhase={motionPhase}
          color={color}
        />
      ))}
    </View>
  );
};

export default VoiceLevelAnimation;

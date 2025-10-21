import React from "react";
import { View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";

interface Props {
  onOpenSheet: () => void;
}

export const FloatingDualButton: React.FC<Props> = ({ onOpenSheet }) => {
  const router = useRouter();
  const translateY = useSharedValue(0);
  const expanded = useSharedValue(0);
  const isExpanded = useSharedValue(false);

  const THRESHOLD = -60;
  const BASE = 58;
  const DOT = 22;

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY < THRESHOLD) {
        isExpanded.value = true;
        expanded.value = withSpring(1, { damping: 12, stiffness: 140 });
      } else {
        isExpanded.value = false;
        expanded.value = withSpring(0, { damping: 12, stiffness: 140 });
      }
      translateY.value = withSpring(0);
    });

  const containerStyle = useAnimatedStyle(() => {
    const height = interpolate(expanded.value, [0, 1], [BASE, BASE + 52]);
    return { height };
  });

  const bunOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(isExpanded.value ? 0 : 1, { duration: 120 }),
  }));

  const plusOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(isExpanded.value ? 1 : 0, { duration: 120 }),
  }));
  const dotStyle = useAnimatedStyle(() => {
    const translateY = interpolate(expanded.value, [0, 1], [0, 26]);
    const opacity = withTiming(expanded.value, { duration: 140 });
    const scale = withTiming(expanded.value ? 1 : 0.2, { duration: 140 });
    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  const handlePress = () => {
    if (isExpanded.value) {
      router.push("/(protected)/task-create");
    } else {
      onOpenSheet();
    }
  };

  return (
    <View pointerEvents="box-none">
      <GestureDetector gesture={gesture}>
        <Animated.View>
          <Pressable onPress={handlePress} hitSlop={10}>
            <Animated.View
              style={[
                {
                  width: BASE,
                  alignItems: "center",
                  overflow: "visible",
                },
                containerStyle,
              ]}
            >
              <View
                style={{
                  width: BASE,
                  height: BASE,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GradientCircle size={BASE}>
                  <Animated.Image
                    source={ASSETS.whiteBun}
                    resizeMode="contain"
                    style={[{ width: 26, height: 26, position: "absolute" }, bunOpacity]}
                  />

                  {/* 新的加号图标 */}
                  <Animated.Image
                    source={ASSETS.plusIcon}
                    resizeMode="contain"
                    style={[{ width: 26, height: 26, position: "absolute" }, plusOpacity]}
                  />
                </GradientCircle>
              </View>

              <Animated.View
                style={[
                  {
                    width: DOT,
                    height: DOT,
                    borderRadius: DOT / 2,
                    overflow: "hidden",
                    marginTop: 2,
                  },
                  dotStyle,
                ]}
              >
                <GradientCircle size={20} />
              </Animated.View>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

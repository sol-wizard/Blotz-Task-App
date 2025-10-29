import { ASSETS } from "@/shared/constants/assets";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoadingScreen() {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const amplitude = 40;
    const duration = 800;
    const pause = 200;
    const half = Math.max(1, Math.floor(duration / 2));

    const singleCycle = Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: -amplitude,
        duration: half,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 0,
        duration: half,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(pause),
    ]);

    const loop = Animated.loop(singleCycle);
    loop.start();

    return () => loop.stop();
  }, []);

  const scale = bounceAnim.interpolate({
    inputRange: [-30, 0],
    outputRange: [1.05, 1],
  });

  return (
    <SafeAreaView className="items-center justify-center flex-1 bg-transparent">
      <View pointerEvents="none">
        <Animated.Image
          source={ASSETS.loadingBun}
          style={[{ width: 80, height: 80, transform: [{ translateY: bounceAnim }, { scale }] }]}
          resizeMode="contain"
        />
      </View>
      <Text className="font-balooBold text-3xl mt-4">Loading...</Text>
    </SafeAreaView>
  );
}

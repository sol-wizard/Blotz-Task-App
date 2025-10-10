// src/feature/ai-task-generate/component/voice-waves.tsx
import React from "react";
import { View } from "react-native";
import LottieView from "lottie-react-native";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";

export const VoiceWaves = () => {
  return (
    <View className="flex-row items-center justify-center">
      <LottieView
        source={LOTTIE_ANIMATIONS.voiceWave}
        autoPlay
        loop
        style={{ width: 120, height: 120, transform: [{ scaleX: -1 }] }}
      />
      <LottieView
        source={LOTTIE_ANIMATIONS.voiceWave}
        autoPlay
        loop
        style={{ width: 120, height: 120 }}
      />
    </View>
  );
};

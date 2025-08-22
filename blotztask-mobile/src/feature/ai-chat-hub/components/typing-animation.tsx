import React from "react";
import LottieView from "lottie-react-native";
import { View, Text } from "react-native";

interface TypingAnimationProps {
  visible: boolean;
}

export default function TypingAnimation({ visible }: TypingAnimationProps) {
  if (!visible) return null;

  return (
    <View>
        <LottieView
        source={require("../assets/aiLoadingEffect.json")} // Lottie 文件路径
        autoPlay
        loop
        style={{ width: 60, height: 40 }}
        />
        <Text className="ml-2 text-sm text-gray-500 italic">AI is thinking…</Text>
    </View>
    
  );
}

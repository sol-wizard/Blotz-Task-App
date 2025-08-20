import React from "react";
import { View, Text } from "react-native";
import TypingDots from "./typing-dots";

export default function TypingBubble() {
  return (
    <View className="self-start max-w-[85%] my-2">
      <View className="bg-gray-100 px-3 py-2 rounded-2xl">
        <TypingDots />
      </View>
      <Text className="text-gray-500 text-[11px] mt-1">AI is thinking…</Text>
    </View>
  );
}

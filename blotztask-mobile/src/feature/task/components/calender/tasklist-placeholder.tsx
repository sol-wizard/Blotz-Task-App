import React from "react";
import { View, Text } from "react-native";
import LottieView from "lottie-react-native";
import emptyBoxAnimation from "../../../../../assets/images/empty-box.json";

export function TaskListPlaceholder() {
  return (
    <View className="flex-1 items-center justify-center px-4">
      <LottieView
        source={emptyBoxAnimation}
        autoPlay
        loop
        style={{ width: 160, height: 160, marginBottom: 16 }}
      />
      <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">No tasks found</Text>
      <Text className="text-gray-500 text-center max-w-xs">
        Try adjusting your filter or add a new task.
      </Text>
    </View>
  );
}

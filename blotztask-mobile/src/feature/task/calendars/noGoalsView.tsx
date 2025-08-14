import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import LottieView from "lottie-react-native";

export default function NoGoalsView() {
  return (
    <View className="flex-1 justify-center items-center p-5 bg-white">
      <LottieView
        source={require("../../../../assets/images/empty-box.json")}
        autoPlay
        loop
        style={{ width: 160, height: 160 }}
      />

      <Text className="text-xl font-bold text-zinc-800 mb-2">
        No tasks for this day
      </Text>
      <Text className="text-base text-zinc-600 text-center mb-5">
        Your to do list is empty. Wanna Create new?
      </Text>

      <TouchableOpacity className="flex-row items-center bg-zinc-100 p-4 rounded-lg mb-4">
        <Text className="text-base font-semibold text-zinc-800 ml-2">
          Check Sample
        </Text>
        <Text className="ml-auto text-zinc-800">→</Text>
      </TouchableOpacity>
    </View>
  );
}

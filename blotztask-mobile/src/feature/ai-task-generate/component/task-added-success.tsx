import { ASSETS } from "@/shared/constants/assets";
import React from "react";
import { View, Image, Text } from "react-native";

export const TaskAddedSuccess = () => {
  return (
    <View className="flex-1 items-center justify-center">
      <Image source={ASSETS.addTask} className="w-42 h-18" resizeMode="contain" />
      <Text className="mt-4 text-[16px] leading-[20px] text-[#444964] text-center font-balooBold">
        Yay! Task added!
      </Text>
    </View>
  );
};

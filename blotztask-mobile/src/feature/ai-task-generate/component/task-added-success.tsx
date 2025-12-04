import { ASSETS } from "@/shared/constants/assets";
import React from "react";
import { View, Image, Text } from "react-native";

export const TaskAddedSuccess = () => {
  return (
    <View className="flex-1 w-full justify-center items-center py-8">
      <Image source={ASSETS.addTask} className="w-52 h-28" resizeMode="contain" />

      <Text
        className="mt-4 text-[16px] font-bold text-[#444964] text-center"
        style={{ lineHeight: 20 }}
      >
        Yay! Task added!
      </Text>
    </View>
  );
};

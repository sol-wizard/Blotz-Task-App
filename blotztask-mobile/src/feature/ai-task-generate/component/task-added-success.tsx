import { ASSETS } from "@/shared/constants/assets";
import React from "react";
import { View, Image } from "react-native";

export const TaskAddedSuccess = () => {
  return (
    <View className="flex-1 w-full justify-center items-center py-8">
      <Image source={ASSETS.addTask} className="w-96 h-64" resizeMode="contain" />
    </View>
  );
};

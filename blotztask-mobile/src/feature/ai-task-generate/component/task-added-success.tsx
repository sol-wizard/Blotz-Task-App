import React from "react";
import { View, Text, Image } from "react-native";

export const TaskAddedSuccess = () => {
  return (
    <View className="flex-1 w-full bg-[#F3F8FF] justify-center items-center py-8">
      <View className="w-24 h-16 justify-center items-center relative">
        <Image
          source={require("../../../../assets/images-png/loading-logo.png")}
          className="w-full h-full"
          resizeMode="contain"
        />

        <Image
          source={require("../../../../assets/images-png/success-check.png")}
          className="w-6 h-6 absolute right-2 bottom-0"
          resizeMode="contain"
        />
      </View>

      <Text className="mt-6 text-[20px] font-bold text-[#3F4354] text-center">
        Yay! Task added!
      </Text>
    </View>
  );
};

import React from "react";
import { View, Text, Image, ImageBackground } from "react-native";

export const TaskSuccessCheck = () => {
  return (
    <ImageBackground
      source={require("../../../../assets/images-png/background.png")}
      className="flex-1 justify-center items-center py-8"
      resizeMode="cover"
    >
      <View className="w-40 h-32 justify-center items-center relative">
        <Image
          source={require("../../../../assets/images-png/loading-logo.png")}
          className="w-full h-full"
          resizeMode="contain"
        />

        <Image
          source={require("../../../../assets/images-png/success-check.png")}
          className="w-14 h-14 absolute right-2 bottom-0"
          resizeMode="contain"
        />
      </View>

      <Text className="mt-6 text-[20px] font-bold text-[#3F4354] text-center">
        Yay! Task added!
      </Text>
    </ImageBackground>
  );
};

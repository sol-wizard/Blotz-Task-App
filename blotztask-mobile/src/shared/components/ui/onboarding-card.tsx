import { ASSETS } from "@/shared/constants/assets";
import React from "react";
import { Image, Text, View } from "react-native";

type OnboardingHintCardProps = {
  title: string;
  subtitle: string;
  style?: object;
};

export const OnboardingCard = ({ title, subtitle, style }: OnboardingHintCardProps) => {
  return (
    <View
      pointerEvents="none"
      className="flex-row items-center bg-white rounded-[24px] px-4 py-3.5"
      style={style}
    >
      <View className="rounded-full items-center justify-center mr-3">
        <Image source={ASSETS.greenBun} className="w-13 h-13" />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-balooBold text-info">{title}</Text>
        <Text className="text-info font-baloo">{subtitle}</Text>
      </View>
    </View>
  );
};

import { ASSETS } from "@/shared/constants/assets";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type OnboardingBreakdownSectionProps = {
  onSkip: () => void;
  onBack: () => void;
};

export function OnboardingBreakdownSection({
  onSkip,
  onBack,
}: OnboardingBreakdownSectionProps) {
  return (
    <View className="flex-1 px-6">
      <View className="flex-row items-center justify-between pt-2">
        <Pressable onPress={onBack} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#8C8C8C" />
        </Pressable>
        <Pressable onPress={onSkip} hitSlop={10}>
          <Text className="text-xl font-baloo text-secondary">Skip</Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center">
        <Image source={ASSETS.yellowStar} className="w-32 h-32 mb-6" resizeMode="contain" />
        <Text className="text-3xl font-balooBold text-black text-center">
          Break tasks down
        </Text>
        <Text className="text-base font-baloo text-secondary text-center mt-2">
          Turn big goals into bite-sized steps you can finish fast.
        </Text>
      </View>
    </View>
  );
}

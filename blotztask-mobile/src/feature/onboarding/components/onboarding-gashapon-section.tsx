import { ASSETS } from "@/shared/constants/assets";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type OnboardingGashaponSectionProps = {
  onSkip: () => void;
  onBack: () => void;
};

export function OnboardingGashaponSection({
  onSkip,
  onBack,
}: OnboardingGashaponSectionProps) {
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
        <Image
          source={ASSETS.gashaponMachineBase}
          className="w-44 h-44 mb-6"
          resizeMode="contain"
        />
        <Text className="text-3xl font-balooBold text-black text-center">
          Earn sparks and gashapon
        </Text>
        <Text className="text-base font-baloo text-secondary text-center mt-2">
          Finish tasks to collect Star Sparks and spin the gashapon machine.
        </Text>
      </View>
    </View>
  );
}

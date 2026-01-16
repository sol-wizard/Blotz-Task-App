import { ASSETS } from "@/shared/constants/assets";
import { useUserOnboardingStatus } from "@/feature/ai-task-generate/hooks/useUserOnboardingStatus";
import { router } from "expo-router";
import React from "react";
import { Image, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingScreen() {
  const { setUserOnboarded } = useUserOnboardingStatus();

  const handleFinish = () => {
    setUserOnboarded.mutate(true);
    router.replace("/(protected)");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6">
        <View className="items-end pt-2">
          <Pressable onPress={handleFinish} hitSlop={10}>
            <Text className="text-xl font-baloo text-secondary">Skip</Text>
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center">
          <Image source={ASSETS.blotzIcon} className="w-24 h-24 mb-6" resizeMode="contain" />
          <Text className="text-3xl font-balooBold text-black text-center">
            Welcome to Blotz Tasks
          </Text>
          <Text className="text-base font-baloo text-secondary text-center mt-2">
            Keep planning light, tidy, and easy.
          </Text>
        </View>

        <Pressable onPress={handleFinish} className="w-full bg-black rounded-full py-4">
          <Text className="text-white text-lg font-baloo text-center">Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

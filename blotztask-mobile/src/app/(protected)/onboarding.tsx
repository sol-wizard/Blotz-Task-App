import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { OnboardingAiSection } from "@/feature/onboarding/components/onboarding-ai-section";
import { OnboardingBreakdownSection } from "@/feature/onboarding/components/onboarding-breakdown-section";
import { OnboardingNoteSection } from "@/feature/onboarding/components/onboarding-note-section";
import { OnboardingIntroSection } from "@/feature/onboarding/components/onboarding-intro-section";
import { DotIndicator } from "@/feature/onboarding/components/dot-indicator";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLanguageInit } from "@/shared/hooks/useLanguageInit";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";

export default function OnboardingScreen() {
  const { setUserOnboarded } = useUserProfileMutation();
  const { t } = useTranslation("onboarding");
  useLanguageInit();

  const sections = ["intro", "ai", "breakdown", "gashapon"];
  const [activeOnboardingIndex, setActiveOnboardingIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const handleFinish = async () => {
    await setUserOnboarded(true);
    router.replace("/(protected)/(tabs)");
  };

  const handleNext = () => {
    if (activeOnboardingIndex >= sections.length - 1) {
      handleFinish();
      return;
    }

    setDirection("forward");
    requestAnimationFrame(() => {
      setActiveOnboardingIndex((prev) => prev + 1);
    });
  };

  const handleBack = () => {
    setDirection("backward");
    requestAnimationFrame(() => {
      setActiveOnboardingIndex((prev) => Math.max(0, prev - 1));
    });
  };

  const activeSection = sections[activeOnboardingIndex];
  const activeView = (() => {
    switch (activeSection) {
      case "intro":
        return <OnboardingIntroSection />;
      case "ai":
        return <OnboardingAiSection />;
      case "breakdown":
        return <OnboardingBreakdownSection />;
      case "gashapon":
        return <OnboardingNoteSection />;
      default:
        return null;
    }
  })();

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header buttons */}
      <View className="flex-row items-center justify-between px-6 pt-2">
        {activeOnboardingIndex > 0 ? (
          <Pressable onPress={handleBack} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color="#8C8C8C" />
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable onPress={handleFinish} hitSlop={10}>
          <Text className="text-xl font-baloo text-secondary">{t("actions.skip")}</Text>
        </Pressable>
      </View>

      <Animated.View
        key={activeSection}
        exiting={direction === "forward" ? SlideOutLeft.duration(400) : SlideOutRight.duration(400)}
        entering={direction === "forward" ? SlideInRight.duration(400) : SlideInLeft.duration(400)}
        className="flex-1"
      >
        {activeView}
      </Animated.View>
      <View className="items-center pb-6 px-6">
        <View className="flex-row items-center mb-4">
          {sections.map((section, index) => {
            return (
              <DotIndicator
                key={`${section}-${index}`}
                isActive={index === activeOnboardingIndex}
                isLast={index === sections.length - 1}
              />
            );
          })}
        </View>
        <Pressable onPress={handleNext} className="w-full bg-black rounded-full py-4">
          <Text className="text-white text-lg font-baloo text-center">{t("actions.continue")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

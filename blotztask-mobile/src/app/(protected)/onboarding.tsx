import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { OnboardingAiSection } from "@/feature/onboarding/components/onboarding-ai-section";
import { OnboardingBreakdownSection } from "@/feature/onboarding/components/onboarding-breakdown-section";
import { OnboardingGashaponSection } from "@/feature/onboarding/components/onboarding-gashapon-section";
import { OnboardingIntroSection } from "@/feature/onboarding/components/onboarding-intro-section";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLanguageInit } from "@/shared/hooks/useLanguageInit";

export default function OnboardingScreen() {
  const { setUserOnboarded } = useUserProfileMutation();
  const { t } = useTranslation("onboarding");
  useLanguageInit();

  const sections = ["intro", "ai", "breakdown", "gashapon"];
  const [activeOnboardingIndex, setActiveOnboardingIndex] = useState(0);

  const handleFinish = async () => {
    await setUserOnboarded(true);
    router.replace("/(protected)");
  };

  const handleNext = () => {
    if (activeOnboardingIndex >= sections.length - 1) {
      handleFinish();
      return;
    }

    setActiveOnboardingIndex((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveOnboardingIndex((prev) => Math.max(0, prev - 1));
  };

  const activeSection = sections[activeOnboardingIndex];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {activeSection === "intro" && <OnboardingIntroSection onSkip={handleFinish} />}
      {activeSection === "ai" && <OnboardingAiSection onSkip={handleFinish} onBack={handleBack} />}
      {activeSection === "breakdown" && (
        <OnboardingBreakdownSection onSkip={handleFinish} onBack={handleBack} />
      )}
      {activeSection === "gashapon" && (
        <OnboardingGashaponSection onSkip={handleFinish} onBack={handleBack} />
      )}
      <View className="items-center pb-6 px-6">
        <View className="flex-row items-center mb-4">
          {sections.map((section, index) => {
            const isActive = index === activeOnboardingIndex;
            const key = `${section}-${index}`;
            return (
              <View
                key={key}
                className={`${isActive ? "w-6 bg-black" : "w-2 bg-gray-300"} h-2 rounded-full ${
                  index < sections.length - 1 ? "mr-2" : ""
                }`}
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

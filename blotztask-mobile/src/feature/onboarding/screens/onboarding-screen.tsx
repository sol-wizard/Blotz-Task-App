import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { OnboardingAiSection } from "@/feature/onboarding/components/onboarding-ai-section";
import { OnboardingBreakdownSection } from "@/feature/onboarding/components/onboarding-breakdown-section";
import { OnboardingNoteSection } from "@/feature/onboarding/components/onboarding-note-section";
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

  const sections = ["ai-voice", "star-spark", "breakdown"];
  const [activeOnboardingIndex, setActiveOnboardingIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const handleFinish = async () => {
    await setUserOnboarded(true);
    router.replace("/(protected)/(tabs)");
  };

  const handleNext = () => {
    setDirection("forward");

    setTimeout(() => {
      if (activeOnboardingIndex >= sections.length - 1) {
        handleFinish();
        return;
      }

      setActiveOnboardingIndex((prev) => prev + 1);
    }, 10);
  };

  const handleBack = () => {
    setDirection("backward");

    setTimeout(() => {
      setActiveOnboardingIndex((prev) => Math.max(0, prev - 1));
    }, 10);
  };

  const activeSection = sections[activeOnboardingIndex];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {activeSection === "ai-voice" && (
        <OnboardingAiSection onSkip={handleFinish} onBack={handleBack} direction={direction} />
      )}
      {activeSection === "breakdown" && (
        <OnboardingBreakdownSection
          onSkip={handleFinish}
          onBack={handleBack}
          direction={direction}
        />
      )}
      {activeSection === "star-spark" && (
        <OnboardingNoteSection onSkip={handleFinish} onBack={handleBack} direction={direction} />
      )}
      <View className="items-center pb-8 px-6">
        <View className="flex-row items-center mb-[60px] mt-[-125px]">
          {sections.map((section, index) => {
            const isActive = index === activeOnboardingIndex;
            const key = `${section}-${index}`;
            return (
              <View
                key={key}
                className={`${isActive ? "w-2 bg-black" : "w-2 bg-gray-300"} h-2 rounded-full ${
                  index < sections.length - 1 ? "mr-2" : ""
                }`}
              />
            );
          })}
        </View>
        <Pressable onPress={handleNext} className="w-[46%] h-[48px] bg-[#8BCC5A] rounded-full py-4">
          <Text className="text-white text-lg font-baloo text-center">{t("actions.continue")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

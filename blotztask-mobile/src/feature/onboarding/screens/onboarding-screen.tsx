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
import { ASSETS } from "@/shared/constants/assets";
import { Image } from "expo-image";

export default function OnboardingScreen() {
  const { setUserOnboarded } = useUserProfileMutation();
  const { t } = useTranslation("onboarding");
  useLanguageInit();

  const sections = ["ai-voice", "star-spark", "breakdown"];
  const [activeOnboardingIndex, setActiveOnboardingIndex] = useState(0);

  const handleFinish = async () => {
    await setUserOnboarded(true);
    router.replace("/(protected)/(tabs)");
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
      <View className="absolute top-10 left-0 right-0 items-center pt-2 z-50" pointerEvents="none">
        <Image
          source={ASSETS.onboardingBlotzLogo}
          style={{ width: 70, height: 20 }}
          contentFit="contain"
        />
      </View>
      {activeSection === "ai-voice" && (
        <OnboardingAiSection onSkip={handleFinish} onBack={handleBack} />
      )}
      {activeSection === "breakdown" && (
        <OnboardingBreakdownSection onSkip={handleFinish} onBack={handleBack} />
      )}
      {activeSection === "star-spark" && (
        <OnboardingNoteSection onSkip={handleFinish} onBack={handleBack} />
      )}
      <View className="items-center pb-8 px-6">
        <View className="flex-row items-center mb-[100px] mt-[-160px]">
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

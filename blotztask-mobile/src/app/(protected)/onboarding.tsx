import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { OnboardingAiSection } from "@/feature/onboarding/components/onboarding-ai-section";
import { OnboardingBreakdownSection } from "@/feature/onboarding/components/onboarding-breakdown-section";
import { OnboardingNoteSection } from "@/feature/onboarding/components/onboarding-note-section";
import { OnboardingIntroSection } from "@/feature/onboarding/components/onboarding-intro-section";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLanguageInit } from "@/shared/hooks/useLanguageInit";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

function DotIndicator({ isActive, isLast }: { isActive: boolean; isLast: boolean }) {
  const width = useSharedValue(isActive ? 24 : 8);

  useEffect(() => {
    width.value = withTiming(isActive ? 24 : 8, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: isActive ? "#000000" : "#D1D1D1",
          marginRight: isLast ? 0 : 8,
        },
        animatedStyle,
      ]}
    />
  );
}

function AnimatedSection({
  isActive,
  direction,
  children,
}: {
  isActive: boolean;
  direction: "forward" | "backward";
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(isActive ? 1 : 0);
  const translateX = useSharedValue(isActive ? 0 : direction === "forward" ? 30 : -30);

  useEffect(() => {
    opacity.value = withTiming(isActive ? 1 : 0, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
    translateX.value = withTiming(isActive ? 0 : direction === "forward" ? 30 : -30, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
  }, [isActive, direction]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateX: translateX.value }],
    };
  });

  if (!isActive && opacity.value === 0) {
    return null;
  }

  return (
    <Animated.View style={[{ position: "absolute", width: "100%", height: "100%" }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

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
    setActiveOnboardingIndex((prev) => prev + 1);
  };

  const handleBack = () => {
    setDirection("backward");
    setActiveOnboardingIndex((prev) => Math.max(0, prev - 1));
  };

  const activeSection = sections[activeOnboardingIndex];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <AnimatedSection isActive={activeSection === "intro"} direction={direction}>
          <OnboardingIntroSection onSkip={handleFinish} />
        </AnimatedSection>
        <AnimatedSection isActive={activeSection === "ai"} direction={direction}>
          <OnboardingAiSection onSkip={handleFinish} onBack={handleBack} />
        </AnimatedSection>
        <AnimatedSection isActive={activeSection === "breakdown"} direction={direction}>
          <OnboardingBreakdownSection onSkip={handleFinish} onBack={handleBack} />
        </AnimatedSection>
        <AnimatedSection isActive={activeSection === "gashapon"} direction={direction}>
          <OnboardingNoteSection onSkip={handleFinish} onBack={handleBack} />
        </AnimatedSection>
      </View>
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

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";

type OnboardingAiSectionProps = {
  onSkip: () => void;
  onBack: () => void;
};

export function OnboardingAiSection({ onSkip, onBack }: OnboardingAiSectionProps) {
  const { t } = useTranslation("onboarding");

  return (
    <View className="flex-1 px-6">
      <View className="flex-row items-center justify-between pt-2">
        <Pressable onPress={onBack} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#8C8C8C" />
        </Pressable>
        <Pressable onPress={onSkip} hitSlop={10}>
          <Text className="text-xl font-baloo text-secondary">{t("actions.skip")}</Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center">
        <Image
          source={ASSETS.onboardingCalendar}
          style={{ width: 384, height: 384, marginBottom: 24 }}
          contentFit="contain"
        />
        <Text className="text-3xl font-balooBold text-black text-center">{t("ai.title")}</Text>
        <Text className="text-base font-baloo text-secondary text-center mt-2">
          {t("ai.subtitle")}
        </Text>
      </View>
    </View>
  );
}

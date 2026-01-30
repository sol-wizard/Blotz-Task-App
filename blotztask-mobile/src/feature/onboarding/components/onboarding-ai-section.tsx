import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";

export function OnboardingAiSection() {
  const { t } = useTranslation("onboarding");

  return (
    <View className="flex-1 px-6">
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

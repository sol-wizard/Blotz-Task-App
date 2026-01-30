import { ASSETS } from "@/shared/constants/assets";
import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";

export function OnboardingIntroSection() {
  const { t } = useTranslation("onboarding");

  return (
    <View className="flex-1 px-6">
      <View className="flex-1 items-center justify-center">
        <Image source={ASSETS.blotzIcon} style={{ width: 256, height: 256 }} contentFit="contain" />

        <Text className="text-3xl font-balooBold text-black text-center pt-2">
          {t("intro.title")}
        </Text>
        <Text className="text-base font-baloo text-secondary text-center mt-2">
          {t("intro.subtitle")}
        </Text>
      </View>
    </View>
  );
}

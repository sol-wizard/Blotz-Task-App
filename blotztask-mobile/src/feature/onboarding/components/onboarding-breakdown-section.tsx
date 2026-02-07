import React from "react";
import { Text, View } from "react-native";
import { Image, ImageBackground } from "expo-image";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";

export function OnboardingBreakdownSection() {
  const { t } = useTranslation("onboarding");

  return (
    <View className="flex-1 pt-2 pb-40">
      <ImageBackground
        source={ASSETS.onboardingBreakdownBackground}
        style={{ flex: 1 }}
        contentFit="cover"
      >
        <View className="flex-1 px-6">
          <View className="flex-1 items-center justify-center mt-14">
            <Image
              source={ASSETS.onboardingBreakdown}
              style={{ width: 345, height: 384, marginBottom: 24 }}
              contentFit="contain"
            />

            <Text className="text-3xl font-balooBold text-black text-center">
              {t("breakdown.title")}
            </Text>
            <Text className="text-base font-baloo text-black/40 text-center mt-2">
              {t("breakdown.subtitle")}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

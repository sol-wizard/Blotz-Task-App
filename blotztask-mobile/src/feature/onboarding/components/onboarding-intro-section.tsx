import { ASSETS } from "@/shared/constants/assets";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";

export function OnboardingIntroSection({ onSkip }: { onSkip: () => void }) {
  const { t } = useTranslation("onboarding");

  return (
    <View className="flex-1 px-6">
      <View className="items-end pt-2">
        <Pressable onPress={onSkip} hitSlop={10}>
          <Text className="text-xl font-baloo text-secondary">{t("actions.skip")}</Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center">
        <Image 
          source={ASSETS.blotzIcon} 
          style={{ width: 256, height: 256 }}
          contentFit="contain"
        />
        <Text className="text-3xl font-balooBold text-black text-center pt-1">
          {t("intro.title")}
        </Text>
        <Text className="text-base font-baloo text-secondary text-center mt-2">
          {t("intro.subtitle")}
        </Text>
      </View>
    </View>
  );
}

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image, ImageBackground } from "expo-image";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";

type OnboardingAiSectionProps = {
  onSkip: () => void;
  onBack: () => void;
};

export function OnboardingAiSection({ onSkip, onBack }: OnboardingAiSectionProps) {
  const { t } = useTranslation("onboarding");

  return (
    <View className="flex-1 pt-[4px] pb-[167.31px]">
      <ImageBackground
        source={ASSETS.onboardingVoiceBackground}
        style={{ flex: 1 }}
        contentFit="cover"
      >
        <View className="flex-1 px-6">
          <View className="flex-row items-center justify-between pt-2">
            <View className="w-10" />
            <Pressable onPress={onSkip} hitSlop={10}>
              <Text className="text-xl font-baloo text-black/40">{t("actions.skip")}</Text>
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center mt-16">
            <Image
              source={ASSETS.onboardingVoice}
              style={{ width: 384, height: 384, marginBottom: 24 }}
              contentFit="contain"
            />

            <Text className="text-3xl font-balooBold text-black text-center">
              {t("ai-voice.title")}
            </Text>
            <Text className="text-base font-baloo text-black/40 text-center mt-2">
              {t("ai-voice.subtitle")}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

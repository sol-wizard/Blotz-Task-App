import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image, ImageBackground } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";

type OnboardingNoteSectionProps = {
  onSkip: () => void;
  onBack: () => void;
};

export function OnboardingNoteSection({ onSkip, onBack }: OnboardingNoteSectionProps) {
  const { t } = useTranslation("onboarding");

  return (
    <View className="flex-1 pt-[4px] pb-[167.31px]">
      <ImageBackground
        source={ASSETS.onboardingNoteBackground}
        style={{ flex: 1 }}
        contentFit="cover"
      >
        <View className="flex-1 px-6">
          <View className="flex-row items-center justify-between pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color="#8C8C8C" />
            </Pressable>
            <Pressable onPress={onSkip} hitSlop={10}>
              <Text className="text-xl font-baloo text-black/40">{t("actions.skip")}</Text>
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center mt-14">
            <Image
              source={ASSETS.onboardingStarSpark}
              style={{ width: 384, height: 384, marginBottom: 24 }}
              contentFit="contain"
            />

            <Text className="text-3xl font-balooBold text-black text-center">
              {t("star-spark.title")}
            </Text>
            <Text className="text-base font-baloo text-black/40 text-center mt-2">
              {t("star-spark.subtitle")}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

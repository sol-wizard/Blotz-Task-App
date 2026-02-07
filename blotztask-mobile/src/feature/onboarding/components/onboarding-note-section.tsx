import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image, ImageBackground } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";
import { theme } from "@/shared/constants/theme";
import { BlotzLogo } from "@/shared/components/ui/blotz-logo";
import Animated, {
  FadeInRight,
  FadeInLeft,
  FadeOutRight,
  FadeOutLeft,
} from "react-native-reanimated";

type OnboardingNoteSectionProps = {
  onSkip: () => void;
  onBack: () => void;
  direction: "forward" | "backward";
};

export function OnboardingNoteSection({ onSkip, onBack, direction }: OnboardingNoteSectionProps) {
  const { t } = useTranslation("onboarding");

  const entering = direction === "forward" ? FadeInRight : FadeInLeft;
  const exiting = direction === "forward" ? FadeOutLeft : FadeOutRight;

  return (
    <Animated.View
      entering={entering.springify().damping(70)}
      exiting={exiting}
      className="flex-1 pt-2 pb-40"
    >
      <ImageBackground
        source={ASSETS.onboardingNoteBackground}
        style={{ flex: 1 }}
        contentFit="cover"
      >
        <View className="flex-1 px-6">
          <View className="flex-row items-center pt-2">
            <View className="flex-1 items-start">
              <Pressable onPress={onBack} hitSlop={10}>
                <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
              </Pressable>
            </View>
            <BlotzLogo fontSize={30} />
            <View className="flex-1 items-end">
              <Pressable onPress={onSkip} hitSlop={10}>
                <Text className="text-xl font-baloo text-black/40">{t("actions.skip")}</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-1 items-center justify-center mt-14">
            <Image
              source={ASSETS.onboardingNotes}
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
    </Animated.View>
  );
}

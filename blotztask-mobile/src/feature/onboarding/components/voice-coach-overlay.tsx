import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";
import { GradientCircle } from "@/shared/components/gradient-circle";
import { analytics } from "@/shared/services/analytics";
import { useVoiceCoachStore } from "../hooks/useVoiceCoachStore";

const BUTTON_SIZE = 58;
const RING_SIZE = 84;

const pulse = {
  from: { transform: [{ scale: 0.8 }], opacity: 0.7 },
  to: { transform: [{ scale: 1.6 }], opacity: 0 },
};

/**
 * Shown once, right after onboarding: dims the app and leaves only the AI button lit, so the
 * user's first voice task goes through the real AI sheet rather than a copy of it.
 */
export function VoiceCoachOverlay() {
  const { t } = useTranslation("onboarding");
  const { height: windowHeight } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const isVisible = useVoiceCoachStore((state) => state.isVisible);
  const buttonFrame = useVoiceCoachStore((state) => state.buttonFrame);
  const hide = useVoiceCoachStore((state) => state.hide);

  const isShowing = isVisible && buttonFrame !== null;

  useEffect(() => {
    if (isShowing) analytics.trackOnboardingVoiceCoachShown();
  }, [isShowing]);

  if (!isShowing) return null;

  const centerX = buttonFrame.x + buttonFrame.width / 2;
  const centerY = buttonFrame.y + buttonFrame.height / 2;

  const handleDismiss = () => {
    analytics.trackOnboardingVoiceCoachDismissed();
    hide();
  };

  const handleOpenSheet = () => {
    analytics.trackOnboardingVoiceCoachTapped();
    hide();
    router.push({ pathname: "/ai-task-sheet", params: { source: "onboarding" } });
  };

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={StyleSheet.absoluteFill}
    >
      <Pressable
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel={t("voice-coach.dismiss")}
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.65)" }]}
      />

      <Text
        className="absolute right-6 font-baloo text-lg text-white/70"
        style={{ top: top + 12 }}
        pointerEvents="none"
      >
        {t("voice-coach.dismiss")}
      </Text>

      <View
        pointerEvents="none"
        className="absolute left-6 right-6 items-center"
        style={{ bottom: windowHeight - centerY + RING_SIZE / 2 + 8 }}
      >
        <Text className="font-balooBold text-3xl text-white text-center">
          {t("voice-coach.title")}
        </Text>
        <Text className="font-baloo text-base text-white/70 text-center mt-2">
          {t("voice-coach.subtitle")}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={36} color="white" />
      </View>

      {!reducedMotion && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: centerX - RING_SIZE / 2,
            top: centerY - RING_SIZE / 2,
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            backgroundColor: "white",
            animationName: pulse,
            animationDuration: "1400ms",
            animationIterationCount: "infinite",
            animationTimingFunction: "ease-out",
          }}
        />
      )}

      <Pressable
        onPress={handleOpenSheet}
        accessibilityRole="button"
        accessibilityLabel={t("voice-coach.title")}
        hitSlop={12}
        style={{
          position: "absolute",
          left: centerX - BUTTON_SIZE / 2,
          top: centerY - BUTTON_SIZE / 2,
        }}
      >
        <GradientCircle size={BUTTON_SIZE}>
          <ASSETS.whiteBun width={28} height={28} style={{ position: "absolute" } as const} />
        </GradientCircle>
      </Pressable>
    </Animated.View>
  );
}

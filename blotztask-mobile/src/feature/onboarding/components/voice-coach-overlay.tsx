import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { AI_TAB_BUTTON_SIZE, AiTabButtonIcon } from "@/shared/components/ai-tab-button-icon";
import { AI_SHEET_SOURCE } from "@/feature/ai-task-generate/models/ai-sheet-source";
import { analytics } from "@/shared/services/analytics";
import { useVoiceCoachStore } from "../hooks/useVoiceCoachStore";

const RING_SIZE = 84;

export type ButtonFrame = { x: number; y: number; width: number; height: number };

type Props = {
  /** Window frame of the real AI tab button, so the spotlight sits exactly on it. */
  buttonFrame: ButtonFrame | null;
};

const pulse = {
  from: { transform: [{ scale: 0.8 }], opacity: 0.7 },
  to: { transform: [{ scale: 1.6 }], opacity: 0 },
};

/**
 * Shown once, right after onboarding: dims the app and leaves only the AI button lit, so the
 * user's first voice task goes through the real AI sheet rather than a copy of it.
 */
export function VoiceCoachOverlay({ buttonFrame }: Props) {
  const { t } = useTranslation("onboarding");
  const { top } = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const isVisible = useVoiceCoachStore((state) => state.isVisible);
  const hide = useVoiceCoachStore((state) => state.hide);

  // The button frame is in window coordinates. Measuring this layer the same way and
  // subtracting keeps the spotlight on the button even where the two origins differ
  // (Android can offset window coordinates by the status bar).
  const layerRef = useRef<View>(null);
  const [layer, setLayer] = useState<{ x: number; y: number; height: number } | null>(null);
  const measureLayer = () => {
    layerRef.current?.measureInWindow((x, y, _width, height) => setLayer({ x, y, height }));
  };

  const isShowing = isVisible && buttonFrame !== null && layer !== null;

  useEffect(() => {
    if (isShowing) analytics.trackOnboardingVoiceCoachShown();
  }, [isShowing]);

  // The measuring layer stays mounted (and untouchable) so the coach can fade in and out inside it.
  if (!isShowing) {
    return (
      <View
        ref={layerRef}
        onLayout={measureLayer}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
    );
  }

  const centerX = buttonFrame.x - layer.x + buttonFrame.width / 2;
  const centerY = buttonFrame.y - layer.y + buttonFrame.height / 2;

  const handleDismiss = () => {
    analytics.trackOnboardingVoiceCoachDismissed();
    hide();
  };

  const handleOpenSheet = () => {
    analytics.trackOnboardingVoiceCoachTapped();
    hide();
    router.push({ pathname: "/ai-task-sheet", params: { source: AI_SHEET_SOURCE.ONBOARDING } });
  };

  return (
    <View ref={layerRef} onLayout={measureLayer} style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
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
          style={{ bottom: layer.height - centerY + RING_SIZE / 2 + 8 }}
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
            left: centerX - AI_TAB_BUTTON_SIZE / 2,
            top: centerY - AI_TAB_BUTTON_SIZE / 2,
          }}
        >
          <AiTabButtonIcon />
        </Pressable>
      </Animated.View>
    </View>
  );
}

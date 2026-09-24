import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientColor } from "@/shared/components/gradient-color";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useBadgeDetailQuery } from "../hooks/useBadgeDetailQuery";
import type { BadgePreviewDTO } from "../models/badge-preview-dto";
import type { BadgeSourceRect } from "./animated-badge-item";
import { BadgeDetailContent } from "./badge-detail-content";

interface BadgeRevealOverlayProps {
  badge: BadgePreviewDTO;
  sourceRect: BadgeSourceRect;
  onRevealAnimationStart: (badgeId: number) => void;
  onCloseComplete: () => void;
}

const REVEAL_DURATION_MS = 500;
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

export function BadgeRevealOverlay({
  badge,
  sourceRect,
  onRevealAnimationStart,
  onCloseComplete,
}: BadgeRevealOverlayProps) {
  const { t } = useTranslation("badge");
  const { badgeDetail, isBadgeDetailError } = useBadgeDetailQuery(badge.id);
  const badgeTargetRef = useRef<View>(null);
  const hasStarted = useRef(false);
  const isClosing = useRef(false);

  const progress = useSharedValue(0);
  const targetTranslateX = useSharedValue(0);
  const targetTranslateY = useSharedValue(0);
  const targetScale = useSharedValue(1);

  useEffect(() => {
    return () => {
      cancelAnimation(progress);
    };
  }, [progress]);

  const startReveal = useCallback(() => {
    if (hasStarted.current || !badgeTargetRef.current) return;

    badgeTargetRef.current.measureInWindow((x, y, width, height) => {
      if (hasStarted.current || width <= 0 || height <= 0) return;

      const sourceCenterX = sourceRect.x + sourceRect.width / 2;
      const sourceCenterY = sourceRect.y + sourceRect.height / 2;
      const targetCenterX = x + width / 2;
      const targetCenterY = y + height / 2;

      hasStarted.current = true;
      targetTranslateX.set(targetCenterX - sourceCenterX);
      targetTranslateY.set(targetCenterY - sourceCenterY);
      targetScale.set(width / sourceRect.width);
      onRevealAnimationStart(badge.id);
      progress.set(
        withTiming(1, {
          duration: REVEAL_DURATION_MS,
          easing: EASE_IN_OUT,
          reduceMotion: ReduceMotion.System,
        }),
      );
    });
  }, [
    badge.id,
    onRevealAnimationStart,
    progress,
    sourceRect,
    targetScale,
    targetTranslateX,
    targetTranslateY,
  ]);

  const finishClose = useCallback(() => {
    onCloseComplete();
  }, [onCloseComplete]);

  const closeReveal = useCallback(() => {
    if (isClosing.current) return;

    if (!hasStarted.current) {
      onCloseComplete();
      return;
    }

    isClosing.current = true;
    cancelAnimation(progress);
    progress.set(
      withTiming(
        0,
        {
          duration: REVEAL_DURATION_MS,
          easing: EASE_IN_OUT,
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished) {
            scheduleOnRN(finishClose);
          }
        },
      ),
    );
  }, [finishClose, onCloseComplete, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.35, 1], [0, 0.9, 1], Extrapolation.CLAMP),
  }));

  const titleMotionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.4, 0.75], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(progress.get(), [0, 0.4, 1], [56, 56, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const metadataMotionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.5, 0.85], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(progress.get(), [0, 0.5, 1], [68, 68, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const actionsMotionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.6, 0.95], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(progress.get(), [0, 0.6, 1], [80, 80, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const badgePositionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: targetTranslateX.get() * progress.get() },
      { translateY: targetTranslateY.get() * progress.get() },
    ],
  }));

  const badgeTransformStyle = useAnimatedStyle(() => {
    const revealProgress = progress.get();
    const scale = 1 + (targetScale.get() - 1) * revealProgress;

    return {
      transform: [{ perspective: 800 }, { scale }, { rotateY: `${revealProgress * 360}deg` }],
    };
  });

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeReveal}
    >
      <View style={styles.container}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        />

        {badgeDetail || !isBadgeDetailError ? (
          <View style={styles.detailLayer}>
            <SafeAreaView style={styles.detailLayer}>
              <View className="items-end px-5 py-4">
                <Pressable
                  onPress={closeReveal}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Close badge details"
                  className="h-8 w-8 items-center justify-center rounded-full"
                >
                  <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView
                className="flex-1"
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingHorizontal: 28,
                  paddingBottom: 28,
                }}
                showsVerticalScrollIndicator={false}
              >
                {badgeDetail ? (
                  <BadgeDetailContent
                    badgeDetail={badgeDetail}
                    showBadgeImage={false}
                    badgeSlotRef={badgeTargetRef}
                    onBadgeSlotLayout={startReveal}
                    titleMotionStyle={titleMotionStyle}
                    metadataMotionStyle={metadataMotionStyle}
                    actionsMotionStyle={actionsMotionStyle}
                  />
                ) : (
                  <View className="items-center pt-8">
                    <Animated.View style={titleMotionStyle}>
                      <GradientColor className="mb-14">
                        <Text className="text-4xl font-balooExtraBold text-center leading-normal">
                          {t("achievementUnlocked")}
                        </Text>
                      </GradientColor>
                    </Animated.View>
                    <View
                      ref={badgeTargetRef}
                      collapsable={false}
                      onLayout={startReveal}
                      style={{ width: 235, height: 235, marginBottom: 44 }}
                    />
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        ) : (
          <SafeAreaView style={styles.detailLayer}>
            <View className="items-end px-5 py-4">
              <Pressable
                onPress={closeReveal}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close badge details"
                className="h-8 w-8 items-center justify-center"
              >
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-2xl font-balooBold text-secondary text-center">
                {t("details.notFound")}
              </Text>
            </View>
          </SafeAreaView>
        )}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatingBadgePosition,
            {
              left: sourceRect.x,
              top: sourceRect.y,
              width: sourceRect.width,
              height: sourceRect.height,
            },
            badgePositionStyle,
          ]}
        >
          <Animated.View style={[styles.floatingBadge, badgeTransformStyle]}>
            <Image source={{ uri: badge.iconUrl }} style={styles.badgeImage} contentFit="contain" />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: "#F5FAF8",
  },
  detailLayer: {
    flex: 1,
  },
  floatingBadgePosition: {
    position: "absolute",
  },
  floatingBadge: {
    width: "100%",
    height: "100%",
  },
  badgeImage: {
    width: "100%",
    height: "100%",
  },
});

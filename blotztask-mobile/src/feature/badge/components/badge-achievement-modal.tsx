import { BadgeShareCard } from "@/feature/badge/components/badge-share-card";
import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import { formatBadgeDate } from "@/feature/badge/utils/format-badge-date";
import { useReviewShare } from "@/feature/review/hooks/useReviewShare";
import { GradientColor } from "@/shared/components/gradient-color";
import { ASSETS } from "@/shared/constants/assets";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import MaterialIcons from "@react-native-vector-icons/material-icons/static";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import LottieView from "lottie-react-native";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface BadgeAchievementModalProps {
  badge?: BadgeNotificationDTO;
  onDismiss: () => void;
}

export function BadgeAchievementModal({ badge, onDismiss }: BadgeAchievementModalProps) {
  const { t } = useTranslation("badge");

  const { userProfile } = useUserProfile();

  const shareCardRef = useRef<View>(null);
  const { isSharingImage, shareImage } = useReviewShare({ captureTargetRef: shareCardRef });

  const rewardSound = useAudioPlayer(ASSETS.badgeReward);

  const badgeId = badge?.badgeId;

  // Fire celebration feedback once per badge (re-fires for the next queued badge).
  useEffect(() => {
    if (badgeId == null) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      rewardSound.seekTo(0);
      rewardSound.play();
    } catch {
      // Audio failure must never block the popup.
    }
  }, [badgeId]);

  if (!badge) return null;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View className="flex-1 bg-black/50 items-center justify-center px-8">
        <LottieView
          key={badge.badgeId}
          source={ASSETS.badgeCelebration}
          autoPlay
          loop={false}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
        />
        <View className="w-full items-center">
          <View className="w-full items-end mb-1">
            <Pressable onPress={onDismiss} hitSlop={12}>
              <MaterialIcons name="highlight-off" size={30} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="w-full items-center mb-4">
            <GradientColor>
              <Text className="max-w-64 text-4xl font-balooExtraBold text-center leading-normal">
                {t("achievementUnlocked")}
              </Text>
            </GradientColor>
          </View>

          <Image
            source={{ uri: badge.iconUrl }}
            style={{ width: 128, height: 128, marginBottom: 20 }}
            contentFit="contain"
          />

          <View className="h-14 bg-lime-100 rounded-full px-5 mb-2 items-center justify-center">
            <Text className="text-secondary text-2xl font-bold font-baloo text-center leading-8 pt-1">
              {badge.name}
            </Text>
          </View>

          <Text className="text-white text-xl font-balooThin text-center w-64">
            {badge.description}
          </Text>

          <Text className="text-white text-xl font-baloo mt-4">
            {t("obtainedOn", { date: formatBadgeDate(badge.obtainedAt) })}
          </Text>

          <View className="flex-row items-center justify-center gap-4 mt-8">
            <Pressable
              onPress={() => console.log("Badge view pressed", badge.badgeId)}
              className="min-h-[44px] px-7 py-2.5 rounded-full border-2 border-highlight items-center justify-center"
            >
              <Text className="text-highlight text-base font-balooBold pt-1">{t("view")}</Text>
            </Pressable>

            <Pressable
              onPress={shareImage}
              disabled={isSharingImage}
              className={`min-h-[44px] px-7 py-2.5 rounded-full border-2 border-transparent bg-highlight items-center justify-center ${
                isSharingImage ? "opacity-60" : "opacity-100"
              }`}
            >
              <Text className="text-white text-base font-balooBold pt-1">
                {isSharingImage ? t("sharing") : t("shareReward")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <BadgeShareCard
        ref={shareCardRef}
        badge={badge}
        userDisplayName={userProfile?.displayName}
      />
    </Modal>
  );
}

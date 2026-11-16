import { BadgeShareCard } from "@/feature/badge/components/badge-share-card";
import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import { useReviewShare } from "@/feature/review/hooks/useReviewShare";
import { GradientColor } from "@/shared/components/gradient-color";
import { ASSETS, SVGIMAGES } from "@/shared/constants/assets";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";
import MaterialIcons from "@react-native-vector-icons/material-icons/static";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { analytics } from "@/shared/services/analytics";
import { useEquipBadgeMutation } from "../hooks/useEquipBadgeMutation";

interface BadgeAchievementModalProps {
  badge?: BadgeNotificationDTO;
  onDismiss: () => void;
}

export function BadgeAchievementModal({ badge, onDismiss }: BadgeAchievementModalProps) {
  const { t } = useTranslation("badge");

  const shareCardRef = useRef<View>(null);
  const { isSharingImage, shareImage } = useReviewShare({
    captureTargetRef: shareCardRef,
    source: "badge",
    contentType: "badge",
  });

  const rewardSound = useAudioPlayer(ASSETS.badgeReward);

  const { equipBadge, isEquipping } = useEquipBadgeMutation();
  // Keyed by badge so a failure on one queued badge doesn't show on the next.
  const [equipFailedBadgeId, setEquipFailedBadgeId] = useState<number | null>(null);

  const badgeId = badge?.badgeId;

  // Fire celebration feedback once per badge (re-fires for the next queued badge).
  useEffect(() => {
    if (badgeId == null) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    rewardSound.seekTo(0);
    rewardSound.play();
    analytics.trackBadgeUnlocked({ badgeId });
  }, [badgeId, rewardSound]);

  if (!badge) return null;

  const equipFailed = equipFailedBadgeId === badge.badgeId;
  // Equip and share each dismiss when they finish, so a second action would skip the next queued badge.
  const isBusy = isEquipping || isSharingImage;

  const handleClose = () => {
    if (!isBusy) onDismiss();
  };

  const handleEquip = async () => {
    setEquipFailedBadgeId(null);
    try {
      await equipBadge(badge.badgeId);
      onDismiss();
    } catch {
      // Stay open so the user sees why nothing happened and can retry.
      setEquipFailedBadgeId(badge.badgeId);
    }
  };

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-8">
        {/* Full-screen so the confetti isn't clipped by the card edges. */}
        <LottieView
          key={badge.badgeId}
          source={ASSETS.badgeCelebration}
          autoPlay
          loop={false}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
        />
        <View className="w-full items-center">
          <View className="w-full bg-[#F5FAF8] rounded-3xl overflow-hidden px-6 pt-8 pb-7 items-center">
            {/* "slice" fills the card and crops the edges, so the buns stay cut off at any card height. */}
            {/* Wrapper has no padding, so "100%" is the full card, not the padded content box. */}
            <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
              <SVGIMAGES.badgeModalDecoration
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid slice"
              />
            </View>
            <Pressable
              onPress={handleClose}
              disabled={isBusy}
              hitSlop={12}
              style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}
            >
              <MaterialIcons name="close" size={22} color="#3587F0" />
            </Pressable>

            <GradientColor>
              {/* px-4 keeps a wrapped title clear of the close icon on narrow phones. */}
              <Text className="text-2xl font-balooExtraBold text-center leading-normal px-4">
                {t("achievementUnlocked")}
              </Text>
            </GradientColor>

            <Image
              source={{ uri: badge.iconUrl }}
              style={{ width: 150, height: 150, marginTop: 8, marginBottom: 16 }}
              contentFit="contain"
            />

            <Text className="text-2xl font-balooExtraBold text-secondary text-center mb-2">
              {badge.name}
            </Text>

            <Text className="text-base font-balooBold text-gray-500 text-center leading-6 mb-4">
              {badge.description}
            </Text>

            <Text className="text-sm font-baloo text-gray-400 text-center">
              {t("obtainedOn", {
                date: formatLocalizedDate(badge.obtainedAt, "fullMonthDayYear"),
              })}
            </Text>

            {equipFailed ? (
              <Text className="text-sm font-balooBold text-red-500 text-center mt-4">
                {t("details.equipFailed")}
              </Text>
            ) : null}

            <View className="flex-row items-center justify-center gap-3 mt-6">
              <Pressable
                onPress={handleEquip}
                disabled={isBusy}
                className={`h-12 min-w-32 rounded-full border border-highlight bg-white/60 px-5 items-center justify-center ${
                  isEquipping ? "opacity-60" : "opacity-100"
                }`}
              >
                <Text className="text-base font-balooBold text-highlight">
                  {t("details.equipReward")}
                </Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  await shareImage();
                  onDismiss();
                }}
                disabled={isBusy}
                className={`h-12 min-w-32 rounded-full bg-highlight px-5 items-center justify-center shadow-lg shadow-lime-300 ${
                  isSharingImage ? "opacity-60" : "opacity-100"
                }`}
              >
                <Text className="text-base font-balooBold text-white">
                  {isSharingImage ? t("sharing") : t("shareReward")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <BadgeShareCard ref={shareCardRef} badge={badge} />
    </Modal>
  );
}

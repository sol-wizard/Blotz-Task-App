import { BadgeShareCard } from "@/feature/badge/components/badge-share-card";
import { useBadgeShare } from "@/feature/badge/hooks/useBadgeShare";
import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import { formatBadgeDate } from "@/feature/badge/utils/format-badge-date";
import { GradientColor } from "@/shared/components/gradient-color";
import MaterialIcons from "@react-native-vector-icons/material-icons/static";
import { Image } from "expo-image";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, View } from "react-native";

interface BadgeAchievementModalProps {
  badge?: BadgeNotificationDTO;
  onDismiss: () => void;
}

export function BadgeAchievementModal({ badge, onDismiss }: BadgeAchievementModalProps) {
  const { t } = useTranslation("badge");

  const shareCardRef = useRef<View>(null);
  const { isSharingImage, shareImage } = useBadgeShare({ captureTargetRef: shareCardRef });

  if (!badge) return null;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View className="flex-1 bg-black/50 items-center justify-center px-8">
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

          <View className="flex-row items-center justify-center gap-3 mt-8">
            <Pressable
              onPress={() => console.log("Badge view pressed", badge.badgeId)}
              className="h-12 px-6 rounded-full bg-white/20 items-center justify-center"
            >
              <Text className="text-white text-lg font-balooBold">{t("view")}</Text>
            </Pressable>

            <Pressable
              onPress={shareImage}
              disabled={isSharingImage}
              className={`h-12 px-6 rounded-full bg-lime-100 flex-row items-center justify-center ${
                isSharingImage ? "opacity-60" : "opacity-100"
              }`}
            >
              <MaterialIcons name="share" size={18} color="#444964" />
              <Text className="ml-1 text-secondary text-lg font-balooBold">
                {isSharingImage ? t("sharing") : t("shareReward")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <BadgeShareCard ref={shareCardRef} badge={badge} />
    </Modal>
  );
}

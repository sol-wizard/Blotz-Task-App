import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import { formatBadgeDate } from "@/feature/badge/utils/format-badge-date";
import MaterialIcons from "@react-native-vector-icons/material-icons/static";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, View } from "react-native";

interface BadgeAchievementModalProps {
  badge?: BadgeNotificationDTO;
  onDismiss: () => void;
}

export function BadgeAchievementModal({ badge, onDismiss }: BadgeAchievementModalProps) {
  const { t } = useTranslation("badge");

  if (!badge) return null;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View className="flex-1 bg-black/50 items-center justify-center px-8">
        <View className="w-full items-center">
          <Pressable onPress={onDismiss} hitSlop={12} className="absolute right-0 top-0">
            <MaterialIcons name="highlight-off" size={30} color="#FFFFFF" />
          </Pressable>

          <Text className="text-highlight text-4xl font-baloo mb-4 text-center w-64 leading-normal">
            {t("achievementUnlocked")}
          </Text>

          <Image
            source={{ uri: badge.iconUrl }}
            style={{ width: 128, height: 128, marginBottom: 20 }}
            contentFit="contain"
          />

          <View className="bg-lime-100 rounded-full px-4 py-1.5 mb-2">
            <Text className="text-secondary text-2xl font-bold font-baloo text-center">
              {badge.name}
            </Text>
          </View>

          <Text className="text-white text-xl font-balooThin text-center w-64">
            {badge.description}
          </Text>

          <Text className="text-white text-xl font-baloo mt-4">
            {t("obtainedOn", { date: formatBadgeDate(badge.obtainedAt) })}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

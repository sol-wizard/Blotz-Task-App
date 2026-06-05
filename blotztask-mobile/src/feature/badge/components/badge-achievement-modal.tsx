import { useBadgeQueue } from "@/feature/badge/hooks/useBadgeQueue";
import { formatBadgeDate } from "@/feature/badge/utils/format-badge-date";
import { GradientShader } from "@/shared/components/gradient-shader";
import MaterialIcons from "@react-native-vector-icons/material-icons/static";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, View } from "react-native";

export function BadgeAchievementModal() {
  const { t } = useTranslation("badge");
  const { currentBadge, dismissBadge } = useBadgeQueue();

  if (!currentBadge) return null;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismissBadge}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-8">
        <View className="w-full items-center">
          <View className="w-full items-end mb-1">
            <Pressable onPress={dismissBadge} hitSlop={12}>
              <MaterialIcons name="highlight-off" size={30} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="w-full items-center mb-4">
            <GradientShader>
              <Text className="max-w-64 text-4xl font-balooExtraBold text-center leading-normal">
                {t("achievementUnlocked")}
              </Text>
            </GradientShader>
          </View>

          <Image
            source={{ uri: currentBadge.iconUrl }}
            style={{ width: 128, height: 128, marginBottom: 20 }}
            contentFit="contain"
          />

          <View className="h-14 bg-lime-100 rounded-full px-5 mb-2 items-center justify-center">
            <Text className="text-secondary text-2xl font-bold font-baloo text-center leading-8 pt-1">
              {currentBadge.name}
            </Text>
          </View>

          <Text className="text-white text-xl font-balooThin text-center w-64">
            {currentBadge.description}
          </Text>

          <Text className="text-white text-xl font-baloo mt-4">
            {t("obtainedOn", { date: formatBadgeDate(currentBadge.obtainedAt) })}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import { ASSETS } from "@/shared/constants/assets";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

interface BadgeShareCardProps {
  badge: BadgeNotificationDTO;
  userDisplayName?: string | null;
}

export const BadgeShareCard = forwardRef<View, BadgeShareCardProps>(function BadgeShareCard(
  { badge, userDisplayName },
  ref,
) {
  const { t } = useTranslation("badge");

  return (
    <View ref={ref} collapsable={false} className="absolute left-[-9999px] top-0 w-[340px]">
      <LinearGradient
        colors={["#9AD93E", "#57C785", "#399FB7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 32, padding: 4 }}
      >
        <View className="overflow-hidden rounded-[28px] bg-[#1A213F]">
          <View className="items-center px-6 pt-8 pb-6">
            <Text className="text-white text-3xl font-balooExtraBold text-center leading-normal mb-6">
              {t("shareCardHeadline")}
            </Text>

            <Image
              source={{ uri: badge.iconUrl }}
              style={{ width: 140, height: 140, marginBottom: 20 }}
              contentFit="contain"
            />

            <View className="bg-lime-100 rounded-full px-5 py-2 mb-3 items-center justify-center">
              <Text className="text-secondary text-2xl font-bold font-baloo text-center leading-8 pt-1">
                {badge.name}
              </Text>
            </View>

            <Text className="text-white text-base font-balooThin text-center leading-6 mb-4">
              {badge.description}
            </Text>

            <Text className="text-white/80 text-sm font-baloo mb-6">
              {t("obtainedOn", {
                date: formatLocalizedDate(badge.obtainedAt, "fullMonthDayYear"),
              })}
            </Text>

            <View className="w-full flex-row items-center justify-between px-1">
              <View className="flex-row items-center">
                <Image
                  source={ASSETS.blotzIcon}
                  style={{ width: 22, height: 22, marginRight: 6 }}
                  contentFit="contain"
                />
                <Text className="text-white/90 text-base font-balooBold">Blotz</Text>
              </View>
              {userDisplayName ? (
                <Text className="text-white/90 text-base font-balooBold">@ {userDisplayName}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

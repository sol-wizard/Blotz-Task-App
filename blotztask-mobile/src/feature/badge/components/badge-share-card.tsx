import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import { ASSETS } from "@/shared/constants/assets";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";
import { Image } from "expo-image";
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
    <View ref={ref} collapsable={false} className="absolute left-[-9999px] top-0 w-[326px]">
      <View
        className="min-h-[435px] overflow-hidden rounded-2xl px-6 pt-7 pb-5"
        style={{ backgroundColor: "#F3FAFB" }}
      >
        <View pointerEvents="none" style={{ position: "absolute", left: -48, top: 56 }}>
          <ASSETS.whiteBun width={150} height={130} />
        </View>
        <View pointerEvents="none" style={{ position: "absolute", right: -56, top: 176 }}>
          <ASSETS.whiteBun width={150} height={130} />
        </View>
        <View
          className="absolute left-9 top-14 h-2 w-2 rotate-45 bg-[#B8D7F6]"
          pointerEvents="none"
        />
        <View
          className="absolute right-12 top-12 h-3 w-3 rotate-45 bg-[#F9D96E]"
          pointerEvents="none"
        />
        <View
          className="absolute left-9 bottom-24 h-3 w-3 rotate-45 bg-[#B8D7F6]"
          pointerEvents="none"
        />
        <View className="flex-1 items-center">
          <Text className="text-secondary/55 text-lg font-balooBold text-center leading-6">
            {t("shareCardHeadline")}
          </Text>

          <Image
            source={{ uri: badge.iconUrl }}
            style={{ width: 124, height: 124, marginTop: 8, marginBottom: 8 }}
            contentFit="contain"
          />

          <Text className="text-secondary text-[25px] font-balooBold text-center leading-8 px-4">
            {badge.name}
          </Text>

          <Text className="text-secondary/60 text-[15px] font-baloo text-center leading-5 mt-3 px-2">
            {badge.description}
          </Text>

          <Text className="text-secondary/40 text-sm font-baloo mt-4">
            {t("obtainedOn", {
              date: formatLocalizedDate(badge.obtainedAt, "fullMonthDayYear"),
            })}
          </Text>
        </View>

        <View className="w-full flex-row items-center justify-between px-1 pt-3">
          <View className="flex-row items-center">
            <Image
              source={ASSETS.blotzIcon}
              style={{ width: 18, height: 18, marginRight: 4 }}
              contentFit="contain"
            />
            <Text className="text-[#94C933] text-sm font-balooBold">Blotz task</Text>
          </View>
          {userDisplayName ? (
            <Text className="text-secondary/40 text-sm font-balooBold">@ {userDisplayName}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});

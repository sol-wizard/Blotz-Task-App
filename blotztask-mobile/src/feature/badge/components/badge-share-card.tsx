import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import { ASSETS } from "@/shared/constants/assets";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, View } from "react-native";

interface BadgeShareCardProps {
  badge: BadgeNotificationDTO;
}

function ShareCardTriangle({
  left,
  top,
  size,
  rotation,
}: {
  left: number;
  top: number;
  size: number;
  rotation: number;
}) {
  return (
    <View
      pointerEvents="none"
      className="absolute border-x-transparent border-b-[#BCD8FF]"
      style={{
        left,
        top,
        borderLeftWidth: size / 2,
        borderRightWidth: size / 2,
        borderBottomWidth: size,
        transform: [{ rotate: `${rotation}deg` }],
      }}
    />
  );
}

// Decorative positions mapped from the Figma share-card background reference
// (795x1024 source scaled to the 326x412 captured card).
const BG_TRIANGLES = [
  { left: 33, top: 33, size: 9, rotation: 72 },
  { left: 233, top: 36, size: 15, rotation: 88 },
  { left: 138, top: 49, size: 9, rotation: 49 },
  { left: 279, top: 73, size: 5, rotation: -112 },
  { left: 201, top: 69, size: 13, rotation: -99 },
  { left: 26, top: 82, size: 11, rotation: -84 },
  { left: 97, top: 94, size: 8, rotation: 42 },
  { left: 235, top: 138, size: 8, rotation: 53 },
  { left: 238, top: 229, size: 10, rotation: 154 },
  { left: 56, top: 229, size: 11, rotation: 154 },
  { left: 177, top: 243, size: 11, rotation: 142 },
  { left: 278, top: 251, size: 8, rotation: 118 },
  { left: 122, top: 288, size: 9, rotation: -172 },
  { left: 25, top: 315, size: 12, rotation: -110 },
  { left: 248, top: 338, size: 8, rotation: 65 },
];

function ShareCardBackground() {
  return (
    <View pointerEvents="none" className="absolute inset-0 z-0">
      <View className="absolute left-[-55px] top-[50px] -scale-x-100">
        <ASSETS.whiteBun width={143} height={124} />
      </View>
      <View className="absolute left-[234px] top-[136px]">
        <ASSETS.whiteBun width={143} height={124} />
      </View>

      {BG_TRIANGLES.map((tri, i) => (
        <ShareCardTriangle key={`tri-${i}`} {...tri} />
      ))}
    </View>
  );
}

export const BadgeShareCard = forwardRef<View, BadgeShareCardProps>(function BadgeShareCard(
  { badge },
  ref,
) {
  const { t } = useTranslation("badge");

  return (
    <View ref={ref} collapsable={false} className="absolute left-[-9999px] top-0 w-[326px]">
      <View className="h-[412px] overflow-hidden rounded-2xl bg-[#F3FAFB]">
        <ShareCardBackground />

        {/* Figma order: icon → headline → title → description → date */}
        <View
          pointerEvents="none"
          className="absolute inset-x-0 top-0 z-[1] items-center px-4 pb-12 pt-6"
          style={{ elevation: 1 }}
        >
          <Image
            source={{ uri: badge.iconUrl }}
            className="h-[179px] w-[179px]"
            resizeMode="contain"
          />

          <Text className="mt-6 text-secondary/55 text-lg font-balooBold text-center leading-6">
            {t("shareCardHeadline")}
          </Text>

          <Text
            className="mt-4 w-full text-secondary text-[25px] font-balooBold text-center leading-9"
            numberOfLines={2}
          >
            {badge.name}
          </Text>

          <Text className="mt-3 w-full text-secondary/60 text-[15px] font-baloo text-center leading-[18px]">
            {badge.description}
          </Text>

          <Text className="mt-4 scale-110 text-secondary/40 text-sm font-baloo text-center">
            {t("obtainedOn", {
              date: formatLocalizedDate(badge.obtainedAt, "fullMonthDayYear"),
            })}
          </Text>
        </View>

        <View
          pointerEvents="none"
          className="absolute bottom-3 left-0 right-0 z-[2] scale-110 flex-row items-center justify-center"
          style={{ elevation: 2 }}
        >
          <Image
            source={ASSETS.blotzIcon}
            resizeMode="contain"
            className="mr-1 h-[18px] w-[18px]"
          />
          <Text className="text-[#94C933] text-sm font-balooBold">Blotz task</Text>
        </View>
      </View>
    </View>
  );
});

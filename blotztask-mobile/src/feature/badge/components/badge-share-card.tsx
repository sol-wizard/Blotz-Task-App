import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import { ASSETS } from "@/shared/constants/assets";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface BadgeShareCardProps {
  badge: BadgeNotificationDTO;
}

function ShareCardSquiggle({ color }: { color: string }) {
  return (
    <Svg width={24} height={44} viewBox="0 0 24 44" fill="none">
      <Path
        d="M4 2C0 8 2 14 8 16C14 18 10 25 14 29C17 32 21 30 21 36C21 39 22 41 24 42"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
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

function ShareCardStar({ left, top, size }: { left: number; top: number; size: number }) {
  return (
    <View pointerEvents="none" className="absolute" style={{ left, top }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 1.6 L15.09 7.86 L22 8.87 L17 13.74 L18.18 20.62 L12 17.37 L5.82 20.62 L7 13.74 L2 8.87 L8.91 7.86 Z"
          fill="#F5CB4D"
        />
      </Svg>
    </View>
  );
}

// Pixel-mapped from the 星际漫游 reference (795x1024 -> 326x412 card).
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

const BG_STARS = [
  { left: 137, top: 10, size: 12 },
  { left: 303, top: 18, size: 15 },
  { left: 211, top: 115, size: 22 },
  { left: 246, top: 298, size: 12 },
];

const BG_BLUE_SQUIGGLES = [
  { left: 61, top: 4 },
  { left: 285, top: 77 },
  { left: 30, top: 264 },
];

const BG_PEACH_SQUIGGLES = [
  { left: 16, top: 189 },
  { left: 244, top: 185 },
  { left: 302, top: 300 },
];

export const BadgeShareCard = forwardRef<View, BadgeShareCardProps>(function BadgeShareCard(
  { badge },
  ref,
) {
  const { t } = useTranslation("badge");

  return (
    <View ref={ref} collapsable={false} className="absolute left-[-9999px] top-0 w-[326px]">
      <View className="h-[412px] overflow-hidden rounded-2xl bg-[#F3FAFB]">
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

          {BG_STARS.map((star, i) => (
            <ShareCardStar key={`star-${i}`} {...star} />
          ))}

          {BG_BLUE_SQUIGGLES.map((s, i) => (
            <View key={`sqb-${i}`} className="absolute" style={{ left: s.left, top: s.top }}>
              <ShareCardSquiggle color="#DDEAFF" />
            </View>
          ))}
          {BG_PEACH_SQUIGGLES.map((s, i) => (
            <View key={`sqp-${i}`} className="absolute" style={{ left: s.left, top: s.top }}>
              <ShareCardSquiggle color="#FFCFC3" />
            </View>
          ))}
        </View>

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

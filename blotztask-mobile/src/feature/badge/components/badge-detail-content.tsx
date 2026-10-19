import { BadgeShareCard } from "@/feature/badge/components/badge-share-card";
import { useReviewShare } from "@/feature/review/hooks/useReviewShare";
import { GradientColor } from "@/shared/components/gradient-color";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";
import { Image } from "expo-image";
import { type Ref, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { useEquipBadgeMutation } from "../hooks/useEquipBadgeMutation";
import type { BadgeDetailDTO } from "../models/badge-detail-dto";

interface BadgeDetailContentProps {
  badgeDetail: BadgeDetailDTO;
  showBadgeImage?: boolean;
  badgeSlotRef?: Ref<View>;
  onBadgeSlotLayout?: () => void;
  titleMotionStyle?: AnimatedStyle<ViewStyle>;
  metadataMotionStyle?: AnimatedStyle<ViewStyle>;
  actionsMotionStyle?: AnimatedStyle<ViewStyle>;
}

export function BadgeDetailContent({
  badgeDetail,
  showBadgeImage = true,
  badgeSlotRef,
  onBadgeSlotLayout,
  titleMotionStyle,
  metadataMotionStyle,
  actionsMotionStyle,
}: BadgeDetailContentProps) {
  const { t } = useTranslation("badge");

  const { equipBadge, isEquipping } = useEquipBadgeMutation();
  const isEquipped = badgeDetail.equippedSlot != null;

  const shareCardRef = useRef<View>(null);
  const { isSharingImage, shareImage } = useReviewShare({
    captureTargetRef: shareCardRef,
    source: "badge",
    contentType: "badge",
  });

  return (
    <>
      <View className="items-center pt-8">
        <Animated.View style={titleMotionStyle}>
          <GradientColor className="mb-14">
            <Text className="text-4xl font-balooExtraBold text-center leading-normal">
              {t("achievementUnlocked")}
            </Text>
          </GradientColor>
        </Animated.View>

        <View
          ref={badgeSlotRef}
          collapsable={false}
          onLayout={onBadgeSlotLayout}
          style={{ width: 235, height: 235, marginBottom: 44 }}
        >
          {showBadgeImage ? (
            <Image
              source={{ uri: badgeDetail.iconUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          ) : null}
        </View>

        <Animated.View className="items-center" style={metadataMotionStyle}>
          <Text className="text-3xl font-balooExtraBold text-secondary text-center mb-4">
            {badgeDetail.name}
          </Text>

          <Text className="text-lg font-balooBold text-gray-500 text-center leading-8 mb-7">
            {badgeDetail.description}
          </Text>

          <Text className="text-base font-baloo text-gray-400 text-center">
            {t("obtainedOn", {
              date: formatLocalizedDate(new Date(badgeDetail.obtainedAt), "fullMonthDayYear"),
            })}
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        className="mt-8 flex-row items-center justify-center gap-3"
        style={actionsMotionStyle}
      >
        <Pressable
          className={`h-14 min-w-36 rounded-full border border-highlight bg-white/60 px-5 items-center justify-center ${
            isEquipped || isEquipping ? "opacity-60" : "opacity-100"
          }`}
          onPress={() => equipBadge(badgeDetail.id)}
          disabled={isEquipped || isEquipping}
        >
          <Text className="text-lg font-balooBold text-highlight">
            {isEquipped ? t("details.equipped") : t("details.equipReward")}
          </Text>
        </Pressable>

        <Pressable
          className={`h-14 min-w-36 rounded-full bg-highlight px-5 items-center justify-center shadow-lg shadow-lime-300 ${
            isSharingImage ? "opacity-60" : "opacity-100"
          }`}
          onPress={shareImage}
          disabled={isSharingImage}
        >
          <Text className="text-lg font-balooBold text-white">
            {isSharingImage ? t("sharing") : t("shareReward")}
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View className="mt-auto pt-16" style={actionsMotionStyle}>
        <Text className="text-center text-lg font-balooBold text-highlight">Blotz task</Text>
      </Animated.View>

      <BadgeShareCard
        ref={shareCardRef}
        badge={{ ...badgeDetail, obtainedAt: new Date(badgeDetail.obtainedAt) }}
      />
    </>
  );
}

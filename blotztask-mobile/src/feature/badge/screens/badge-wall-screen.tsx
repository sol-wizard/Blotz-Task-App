import { useFocusEffect } from "expo-router";
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ReturnButton } from "@/shared/components/return-button";
import { useBadgesQuery } from "../hooks/useBadgesQuery";
import {
  AnimatedBadgeItem,
  type BadgeSourceRect,
} from "@/feature/badge/components/animated-badge-item";
import { BadgePreviewDTO } from "../models/badge-preview-dto";
import { useCallback, useEffect, useRef, useState } from "react";
import { analytics } from "@/shared/services/analytics";
import { SCREEN_NAMES } from "@/shared/constants/posthog-events";
import { BadgeRevealOverlay } from "../components/badge-reveal-overlay";

const NUM_COLUMNS = 3;

// `badge: null` is an invisible spacer that keeps the last row's cards at 1/3
// width instead of stretching when the row isn't full.
interface BadgeGridItem {
  key: string;
  badge: BadgePreviewDTO | null;
}

interface BadgeReveal {
  badge: BadgePreviewDTO;
  sourceRect: BadgeSourceRect;
}

export default function BadgeWallScreen() {
  useEffect(() => {
    analytics.trackScreenViewed(SCREEN_NAMES.BADGE_WALL);
  }, []);

  const { t } = useTranslation("badge");
  const { badges } = useBadgesQuery();
  const [reveal, setReveal] = useState<BadgeReveal | null>(null);
  const [hiddenBadgeId, setHiddenBadgeId] = useState<number | null>(null);
  const activeBadgeId = useRef<number | null>(null);
  const isFocused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      activeBadgeId.current = null;

      return () => {
        isFocused.current = false;
        activeBadgeId.current = null;
        setHiddenBadgeId(null);
        setReveal(null);
      };
    }, []),
  );

  const startBadgeAnimation = useCallback((badgeId: number) => {
    if (!isFocused.current || activeBadgeId.current !== null) return false;

    // One synchronous guard for the whole wall, including taps on different items.
    activeBadgeId.current = badgeId;
    return true;
  }, []);

  const showBadgeReveal = useCallback((badge: BadgePreviewDTO, sourceRect: BadgeSourceRect) => {
    if (!isFocused.current || activeBadgeId.current !== badge.id) return;

    setReveal({
      badge,
      sourceRect,
    });
  }, []);

  const closeBadgeDetails = useCallback(() => {
    setHiddenBadgeId(null);
    setReveal(null);
    activeBadgeId.current = null;
  }, []);

  const hideSourceBadge = useCallback((badgeId: number) => {
    if (activeBadgeId.current === badgeId) {
      setHiddenBadgeId(badgeId);
    }
  }, []);

  const cancelBadgeAnimation = useCallback((badgeId: number) => {
    if (activeBadgeId.current === badgeId) {
      activeBadgeId.current = null;
      setHiddenBadgeId(null);
    }
  }, []);

  const gridItems: BadgeGridItem[] = badges.map((badge) => ({ key: String(badge.id), badge }));

  const remainder = gridItems.length % NUM_COLUMNS;
  if (remainder !== 0) {
    for (let i = 0; i < NUM_COLUMNS - remainder; i++) {
      gridItems.push({ key: `spacer-${i}`, badge: null });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 py-4">
        <View className="flex-row items-center">
          <ReturnButton className="mr-4" />

          <Text className="text-2xl font-balooBold text-secondary">{t("wall.title")}</Text>
        </View>

        <Text className="self-end mt-1 text-sm text-gray-500">
          {t("wall.earnedCount", { count: badges.length })}
        </Text>
      </View>

      <FlatList
        data={gridItems}
        keyExtractor={(item) => item.key}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        columnWrapperStyle={{
          gap: 16,
          paddingVertical: 12,
        }}
        renderItem={({ item }) => {
          const badge = item.badge;

          return (
            <View className="flex-1">
              {badge ? (
                <AnimatedBadgeItem
                  badge={badge}
                  isHidden={hiddenBadgeId === badge.id}
                  onRevealStart={startBadgeAnimation}
                  onRevealReady={showBadgeReveal}
                  onRevealCancel={cancelBadgeAnimation}
                />
              ) : null}
            </View>
          );
        }}
      />
      {reveal ? (
        <BadgeRevealOverlay
          badge={reveal.badge}
          sourceRect={reveal.sourceRect}
          onRevealAnimationStart={hideSourceBadge}
          onCloseComplete={closeBadgeDetails}
        />
      ) : null}
    </SafeAreaView>
  );
}

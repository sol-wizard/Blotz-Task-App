import { useRouter } from "expo-router";
import { View, Text, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { ReturnButton } from "@/shared/components/return-button";
import { useBadgesQuery } from "../hooks/useBadgesQuery";
import { useBadgeEquipMutation } from "../hooks/useBadgeEquipMutation";
import { BadgeCard } from "../components/badge-card";
import { BadgePreviewDTO } from "../models/badge-preview-dto";

const NUM_COLUMNS = 3;

// `badge: null` is an invisible spacer that keeps the last row's cards at 1/3
// width instead of stretching when the row isn't full.
interface BadgeGridItem {
  key: string;
  badge: BadgePreviewDTO | null;
}

export default function BadgeWallScreen() {
  const { t } = useTranslation("badge");
  const { badges } = useBadgesQuery();
  const { toggleBadgeEquip, isTogglingBadgeEquip, togglingBadgeId } = useBadgeEquipMutation();
  const router = useRouter();

  const handleLongPress = (badge: BadgePreviewDTO) => {
    // One at a time: two overlapping requests would each read the slots before the other wrote,
    // and the second would undo the first's shift.
    if (isTogglingBadgeEquip) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBadgeEquip({ badgeId: badge.id, isEquipped: badge.equippedSlot !== null });
  };

  const gridItems: BadgeGridItem[] = [...badges]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((badge) => ({ key: String(badge.id), badge }));

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

          <Text className="text-2xl font-balooBold text-secondary">
            {t("wall.title")}
          </Text>
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
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(protected)/badge-details",
                      params: { badgeId: badge.id },
                    })
                  }
                  onLongPress={() => handleLongPress(badge)}
                >
                  <BadgeCard
                    badge={badge}
                    transparent
                    slot={badge.equippedSlot === null ? undefined : badge.equippedSlot + 1}
                    pending={togglingBadgeId === badge.id && isTogglingBadgeEquip}
                  />
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

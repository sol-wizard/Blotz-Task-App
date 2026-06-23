import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ReturnButton } from "@/shared/components/return-button";
import { useBadgesQuery } from "../hooks/useBadgesQuery";
import { BadgeCard } from "../components/badge-card";
import { BadgeDTO } from "../models/badge-preview-dto";

const NUM_COLUMNS = 3;

// `badge: null` is an invisible spacer that keeps the last row's cards at 1/3
// width instead of stretching when the row isn't full.
interface BadgeGridItem {
  key: string;
  badge: BadgeDTO | null;
}

export default function BadgeWallScreen() {
  const { t } = useTranslation("badge");
  const { badges } = useBadgesQuery();

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
    <SafeAreaView className="flex-1 bg-[#E7F7D7]">
      <View className="flex-row items-center px-5 py-4">
        <ReturnButton className="mr-4" />
        <Text className="text-2xl font-balooBold text-secondary">{t("wall.title")}</Text>
      </View>

      <FlatList
        data={gridItems}
        keyExtractor={(item) => item.key}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}
        columnWrapperStyle={{ gap: 16 }}
        renderItem={({ item }) => (
          <View className="flex-1">{item.badge ? <BadgeCard badge={item.badge} /> : null}</View>
        )}
      />
    </SafeAreaView>
  );
}

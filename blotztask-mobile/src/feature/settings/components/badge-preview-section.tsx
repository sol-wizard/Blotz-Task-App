import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { GradientColor } from "@/shared/components/gradient-color";
import { useBadgesQuery } from "@/feature/badge/hooks/useBadgesQuery";
import { getPreviewBadges } from "@/feature/badge/utils/get-preview-badges";
import { BadgeCard } from "@/feature/badge/components/badge-card";

export function BadgePreviewSection() {
  const router = useRouter();
  const { t } = useTranslation("badge");
  const { badges } = useBadgesQuery();

  const previewBadges = getPreviewBadges(badges);

  if (previewBadges.length === 0) {
    return null;
  }

  return (
    <Pressable
      onPress={() => router.push("/settings/badge-wall")}
      className="bg-white w-full rounded-2xl mt-4 px-4 py-4"
    >
      <GradientColor className="self-center mb-3">
        <Text className="text-xl font-balooBold text-center">{t("preview.title")}</Text>
      </GradientColor>

      <View className="flex-row" style={{ gap: 12 }}>
        {previewBadges.map((badge) => (
          <View key={badge.id} className="flex-1">
            <BadgeCard badge={badge} />
          </View>
        ))}
      </View>
    </Pressable>
  );
}

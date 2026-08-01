import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { GradientColor } from "@/shared/components/gradient-color";
import { getPreviewBadges, PREVIEW_SLOT_COUNT } from "@/feature/badge/utils/get-preview-badges";
import { BadgeCard } from "@/feature/badge/components/badge-card";
import { BadgePreviewDTO } from "@/feature/badge/models/badge-preview-dto";

export function BadgePreviewSection({ badges }: { badges: BadgePreviewDTO[] }) {
  const router = useRouter();
  const { t } = useTranslation("badge");

  const previewBadges = getPreviewBadges(badges);

  const slots = Array.from({ length: PREVIEW_SLOT_COUNT }, (_, i) => previewBadges[i] ?? null);

  return (
    <Pressable
      onPress={() => router.push("/(protected)/badge-wall")}
      className="bg-white w-full rounded-2xl mt-4 px-4 py-4"
    >
      <GradientColor className="self-center mb-3">
        <Text className="text-xl font-balooBold text-center">{t("preview.title")}</Text>
      </GradientColor>

      <View className="flex-row" style={{ gap: 12 }}>
        {slots.map((badge, i) => (
          <View key={badge ? badge.id : `empty-${i}`} className="flex-1">
            {badge ? <BadgeCard badge={badge} /> : null}
          </View>
        ))}
      </View>
    </Pressable>
  );
}

import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@react-native-vector-icons/ionicons/static";

export function ReviewListBar({
  count,
  saving,
  generating = false,
  onOpen,
}: {
  count: number;
  saving: boolean;
  generating?: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation("aiCoach");
  if (!count) return null;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t("review.pending", { count })}
      className="mx-4 mt-2 px-3 py-2.5 rounded-2xl bg-secondary flex-row items-center gap-2.5"
    >
      {saving || generating ? (
        <ActivityIndicator size="small" color="#9AD513" />
      ) : (
        <Ionicons name="checkbox-outline" size={18} color="#9AD513" />
      )}
      <Text className="flex-1 font-balooBold text-white">
        {generating ? t("review.generating") : t("review.title")}
      </Text>
      <View className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-highlight items-center justify-center">
        <Text className="font-balooBold text-xs text-white">{count}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
    </Pressable>
  );
}

import { ActivityIndicator, Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@react-native-vector-icons/ionicons/static";

export function ReviewListBar({
  count,
  saving,
  onOpen,
}: {
  count: number;
  saving: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation("aiCoach");
  if (!count) return null;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t("review.pending", { count })}
      className="mx-4 mt-2 px-4 py-3 rounded-xl bg-white border border-gray-200 flex-row items-center gap-2"
    >
      {saving ? (
        <ActivityIndicator size="small" />
      ) : (
        <Ionicons name="list-outline" size={20} color="#4CAF50" />
      )}
      <Text className="flex-1 font-balooBold text-secondary">{t("review.pending", { count })}</Text>
      <Ionicons name="chevron-forward" size={18} color="#8C8C8C" />
    </Pressable>
  );
}

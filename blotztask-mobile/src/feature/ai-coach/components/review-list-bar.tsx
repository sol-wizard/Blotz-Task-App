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
  // A compact pill docked above the composer, so the conversation keeps its height.
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t("review.pending", { count })}
      className="self-center mt-2 pl-3 pr-2 py-1.5 rounded-full bg-secondary flex-row items-center gap-2"
    >
      {saving || generating ? (
        <ActivityIndicator size="small" color="#9AD513" />
      ) : (
        <Ionicons name="checkbox-outline" size={15} color="#9AD513" />
      )}
      <Text className="font-balooBold text-sm text-white">
        {generating ? t("review.generating") : t("review.title")}
      </Text>
      <View className="min-w-[20px] h-5 px-1.5 rounded-full bg-highlight items-center justify-center">
        <Text className="font-balooBold text-xs text-[#2F3347]">{count}</Text>
      </View>
    </Pressable>
  );
}

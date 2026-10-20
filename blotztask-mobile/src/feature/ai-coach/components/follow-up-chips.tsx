import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@react-native-vector-icons/ionicons/static";

/** Tap-to-send next messages, stacked under the latest reply. */
export function FollowUpChips({ items, disabled, onSend }: {
  items: string[];
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const { t } = useTranslation("aiCoach");
  if (items.length === 0) return null;
  return (
    <View accessibilityLabel={t("chat.followUps")} className="items-start gap-2 mt-1 mb-2">
      {items.map((item) => (
        <Pressable key={item} disabled={disabled} accessibilityRole="button" accessibilityLabel={item}
          onPress={() => onSend(item)}
          className={`flex-row items-center gap-1.5 rounded-2xl border border-[#DDE6C8] bg-white px-3.5 py-2 ${disabled ? "opacity-40" : ""}`}>
          <Text className="font-baloo text-sm text-secondary">{item}</Text>
          <Ionicons name="arrow-up-outline" size={12} color="#6B7280" style={{ transform: [{ rotate: "45deg" }] }} />
        </Pressable>
      ))}
    </View>
  );
}

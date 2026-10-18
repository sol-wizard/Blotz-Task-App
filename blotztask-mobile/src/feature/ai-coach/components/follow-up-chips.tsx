import { Pressable, ScrollView, Text } from "react-native";
import { useTranslation } from "react-i18next";

/** Tap-to-send next messages under the latest reply. */
export function FollowUpChips({ items, disabled, onSend }: {
  items: string[];
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const { t } = useTranslation("aiCoach");
  if (items.length === 0) return null;
  return (
    // ScrollView defaults to flexGrow: 1, so a horizontal one would take the chat list's free height.
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      accessibilityLabel={t("chat.followUps")} style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerClassName="px-4 pt-2 gap-2 items-center">
      {items.map((item) => (
        <Pressable key={item} disabled={disabled} accessibilityRole="button" accessibilityLabel={item}
          onPress={() => onSend(item)}
          className={`rounded-full border border-[#E3EDCB] bg-white px-3.5 py-2 ${disabled ? "opacity-40" : ""}`}>
          <Text className="font-baloo text-sm text-secondary">{item}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

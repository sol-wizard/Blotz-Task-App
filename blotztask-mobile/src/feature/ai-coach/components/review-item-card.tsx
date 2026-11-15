import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { TaskDraftItemDto } from "../models/ai-coach-dto";
import { formatDraftWhen, formatRecurrence } from "../utils/draft-format";

/**
 * One suggested task or note under the coach reply that suggested it. The circle saves it (green star) or
 * deletes it again (empty); the pencil edits it.
 */
export function ReviewItemCard({ item, added, readOnly, busy, onToggle, onEdit }: {
  item: TaskDraftItemDto;
  added: boolean;
  /** The list has ended (New topic), so its circles only show what was saved. */
  readOnly: boolean;
  /** The coach is replying and may still change the list. */
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const { t, i18n } = useTranslation("aiCoach");
  const note = item.kind === "note";
  const when = note ? t("review.note")
    : formatDraftWhen(item, t, i18n.resolvedLanguage ?? i18n.language, " · ") ?? t("draft.datePending");
  const detail = item.recurrence ? `${when} · ${formatRecurrence(item.recurrence, t)}` : when;
  const disabled = readOnly || busy;
  return (
    <View className="flex-row items-center bg-white rounded-2xl border border-[#EEF1F3] px-3.5 py-3 my-1">
      <Pressable
        onPress={onToggle}
        disabled={disabled}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: added, disabled }}
        accessibilityLabel={t("card.add", { title: item.title })}
        className={`w-7 h-7 rounded-full items-center justify-center ${
          added ? "bg-highlight" : "border-[1.5px] border-[#C9CED6]"} ${busy ? "opacity-50" : ""}`}
      >
        <Ionicons name={added ? "star" : "add"} size={added ? 14 : 16} color={added ? "#FFFFFF" : "#A3A9B3"} />
      </Pressable>
      <View className="flex-1 mx-3">
        <Text className="font-inter font-semibold text-[15px] text-secondary" numberOfLines={2}>{item.title}</Text>
        <Text className="font-baloo text-[13px] text-[#9AA1AC] mt-0.5" numberOfLines={1}>{detail}</Text>
      </View>
      {!readOnly && (
        <Pressable
          onPress={onEdit}
          disabled={busy}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("review.editItem", { title: item.title })}
          className={busy ? "opacity-50" : undefined}
        >
          <Ionicons name="pencil-outline" size={20} color="#444964" />
        </Pressable>
      )}
    </View>
  );
}

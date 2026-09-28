import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import Toast from "react-native-toast-message";
import { ArtifactEnvelopeDto, EditedDraftDto, EditedDraftItemDto } from "../models/ai-coach-dto";
import { ConfirmAction } from "../hooks/useAiCoachChat";
import { DraftEditModal } from "./draft-edit-modal";

/** Each card has its own lifecycle. Editor changes are saved before the next chat turn. */
export function TaskDraftCard({
  artifact,
  busy,
  onConfirm,
  onReject,
  onEdit,
}: {
  artifact: ArtifactEnvelopeDto;
  busy: boolean;
  onConfirm: (action: ConfirmAction, edited: EditedDraftDto, allowScheduleConflict?: boolean,
    acceptedConflictToken?: string | null) => void;
  onReject: () => void;
  onEdit: (edited: EditedDraftDto) => Promise<string | null>;
}) {
  const { t } = useTranslation("aiCoach");
  const [editingId, setEditingId] = useState<string | null>(null);
  const items: EditedDraftItemDto[] = artifact.payload.items;
  const editable = artifact.status === "pending";
  const disabled = busy || !editable;
  const can = (action: "start_now" | "add_to_task_list" | "reject_draft") =>
    artifact.allowedActions.includes(action);
  const saved = (id: string) =>
    artifact.payload.items.find((item) => item.itemId === id)?.persistedTaskId != null;
  const scheduled = items.every(
    (item) => saved(item.itemId) || (item.date && item.startTime && item.endTime &&
      (!item.recurrence || (item.recurrence.interval >= 1 &&
        (item.recurrence.frequency !== "Weekly" || !!item.recurrence.daysOfWeek) &&
        (!item.recurrence.endDate || item.recurrence.endDate >= item.date)))),
  );
  const editingItem = items.find((item) => item.itemId === editingId);
  const schedule = artifact.schedule;
  const confirmAction = (action: ConfirmAction) => {
    if (schedule?.status === "conflict" && schedule.scope === (action === "start_now" ? "start_now" : "scheduled")) {
      Alert.alert(t("draft.scheduleConflictTitle"), t("draft.scheduleConflictConfirm"), [
        { text: t("draft.cancel"), style: "cancel" },
        { text: t("draft.saveDespiteConflict"), onPress: () =>
          onConfirm(action, { items }, true, schedule.conflictToken) },
      ]);
      return;
    }
    onConfirm(action, { items });
  };

  const saveEdit = async (next: EditedDraftItemDto[]) => {
    const error = await onEdit({ items: next });
    if (error) {
      Toast.show({ type: "error", text1: t("draft.editFailed") });
      return;
    }
    setEditingId(null);
  };

  return (
    <View className="bg-white rounded-2xl p-4 mx-1 my-2 shadow-sm border border-gray-100">
      <Text className="font-baloo text-xs text-primary mb-2">
        {artifact.status === "completed"
          ? t("draft.alreadySaved")
          : t("draft.taskCount", { count: items.length })}
      </Text>
      {items.map((item, index) => (
        <View key={item.itemId} className={index > 0 ? "border-t border-gray-100 pt-3 mt-3" : ""}>
          <View className="flex-row items-start justify-between">
            <Text className="font-balooBold text-base text-secondary flex-1 pr-2">
              {item.title}
            </Text>
            {saved(item.itemId) ? (
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            ) : (
              editable && (
                <View className="flex-row items-center gap-3">
                  <Pressable
                    hitSlop={8}
                    disabled={disabled}
                    onPress={() => setEditingId(item.itemId)}
                    accessibilityLabel={t("draft.edit")}
                  >
                    <Ionicons name="pencil" size={18} color="#8C8C8C" />
                  </Pressable>
                  {items.length > 1 && (
                    <Pressable
                      hitSlop={8}
                      disabled={disabled}
                      onPress={() =>
                        void saveEdit(items.filter((entry) => entry.itemId !== item.itemId))
                      }
                      accessibilityLabel={t("draft.removeTask")}
                    >
                      <Ionicons name="close" size={20} color="#8C8C8C" />
                    </Pressable>
                  )}
                </View>
              )
            )}
          </View>
          {item.description && (
            <Text className="font-baloo text-sm text-secondary mt-1">{item.description}</Text>
          )}
          <Text className="font-baloo text-sm text-primary mt-2">
            {item.date ?? t("draft.datePending")} · {item.startTime ?? "—"} – {item.endTime ?? "—"}
          </Text>
          {item.recurrence && (
            <Text className="font-baloo text-sm text-info mt-1">
              {t("draft.repeats")} {t(`editModal.frequency.${item.recurrence.frequency}`)}
              {item.recurrence.interval > 1 ? ` × ${item.recurrence.interval}` : ""}
              {item.recurrence.frequency === "Weekly" && item.recurrence.daysOfWeek != null
                ? ` · ${[1, 2, 4, 8, 16, 32, 64].map((flag, index) =>
                    item.recurrence && (item.recurrence.daysOfWeek ?? 0) & flag
                      ? t(`editModal.weekday.${index}`) : null).filter(Boolean).join("、")}` : ""}
              {item.recurrence.frequency === "Monthly" && item.recurrence.dayOfMonth != null
                ? ` · ${t("editModal.dayOfMonth")} ${item.recurrence.dayOfMonth}` : ""}
              {` · ${t("editModal.endDate")}: ${item.recurrence.endDate ?? t("editModal.noEndDate")}`}
            </Text>
          )}
        </View>
      ))}
      {editable && !scheduled && (
        <Text className="font-baloo text-xs text-info mt-3">{t("draft.scheduleRequired")}</Text>
      )}
      {editable && schedule?.status === "conflict" && (
        <Text className="font-baloo text-xs text-warning mt-3">
          {t("draft.scheduleConflict", { tasks: schedule.conflicts.map((entry) => entry.taskTitle).join("、") })}
        </Text>
      )}
      {editable && schedule?.status === "unverified" && (
        <Text className="font-baloo text-xs text-warning mt-3">{t("draft.scheduleUnverified")}</Text>
      )}
      {editable && schedule && items.some((item) => item.recurrence != null) && (
        <Text className="font-baloo text-xs text-info mt-3">{t("draft.schedulePartial")}</Text>
      )}
      {artifact.saveError && (
        <Text className="font-baloo text-xs text-warning mt-2">{t("draft.saveFailed")}</Text>
      )}
      {artifact.payload.focusMinutes != null && editable && (
        <Text className="font-baloo text-xs text-info mt-2">
          {t("draft.focusPreview", { minutes: artifact.payload.focusMinutes })}
        </Text>
      )}
      {artifact.status === "processing" ? (
        <ActivityIndicator />
      ) : (
        editable && (
          <View className={`mt-3 ${disabled ? "opacity-50" : ""}`}>
            {can("start_now") && (
              <Pressable
                className={`bg-highlight rounded-xl py-3 items-center ${!scheduled ? "opacity-40" : ""}`}
                disabled={disabled || !scheduled}
                onPress={() => confirmAction("start_now")}
              >
                <Text className="font-balooBold text-white text-base">{t("draft.startNow")}</Text>
              </Pressable>
            )}
            {can("add_to_task_list") && (
              <Pressable
                className={`border border-gray-300 rounded-xl py-2 items-center mt-2 ${!scheduled ? "opacity-40" : ""}`}
                disabled={disabled || !scheduled}
                onPress={() => confirmAction("add_to_task_list")}
              >
                <Text className="font-balooBold text-secondary text-sm">
                  {items.length > 1
                    ? t("draft.addAllToTaskList", {
                        count: items.filter((item) => !saved(item.itemId)).length,
                      })
                    : t("draft.addToTaskList")}
                </Text>
              </Pressable>
            )}
            {can("reject_draft") && (
              <Pressable className="items-center py-2 mt-1" disabled={disabled} onPress={onReject}>
                <Text className="font-baloo text-primary text-xs underline">
                  {items.length > 1 ? t("draft.rejectAll") : t("draft.reject")}
                </Text>
              </Pressable>
            )}
          </View>
        )
      )}
      {editingItem && (
        <DraftEditModal
          key={`${artifact.id}:${artifact.version}:${editingItem.itemId}`}
          visible
          initial={editingItem}
          busy={busy}
          onCancel={() => setEditingId(null)}
          onSave={(next) =>
            void saveEdit(items.map((item) => (item.itemId === next.itemId ? next : item)))
          }
        />
      )}
    </View>
  );
}

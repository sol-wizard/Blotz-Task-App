import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import {
  ArtifactEnvelopeDto,
  ConversationActionWire,
  EditedDraftDto,
  EditedDraftItemDto,
  TaskDraftItemDto,
} from "../models/ai-coach-dto";
import { ConfirmAction } from "../hooks/useAiCoachChat";
import { DraftEditModal } from "./draft-edit-modal";

/**
 * The Task Draft card (requirements §9/§10): ONE card holding one or more tasks ("user says
 * N things → N tasks", product decision 2026-08-22). Each row can be edited or removed before
 * confirming; rows already saved by an earlier (partially failed) confirm are locked.
 * Action buttons are rendered STRICTLY from the server's allowedActions (§18) — nothing is
 * hard-coded; the server only offers "start now" on a single-task card.
 */
export function TaskDraftCard({
  artifact,
  allowedActions,
  busy,
  onConfirm,
  onReject,
}: {
  artifact: ArtifactEnvelopeDto;
  allowedActions: ConversationActionWire[];
  busy: boolean;
  onConfirm: (action: ConfirmAction, edited: EditedDraftDto) => void;
  onReject: () => void;
}) {
  const { t } = useTranslation("aiCoach");
  const [items, setItems] = useState<EditedDraftItemDto[]>(toEdited(artifact));
  const [editingId, setEditingId] = useState<string | null>(null);

  // A new draft (or server-side payload change) resets local edits — the render-time
  // "adjust state when props change" pattern, not an effect.
  const draftKey = `${artifact.id}:${artifact.version}`;
  const [seenDraftKey, setSeenDraftKey] = useState(draftKey);
  if (seenDraftKey !== draftKey) {
    setSeenDraftKey(draftKey);
    setItems(toEdited(artifact));
    setEditingId(null);
  }

  // Spinner only while THIS draft is being confirmed. A chat message in flight (busy) must
  // not collapse the card — that read as "the card keeps disappearing" (bug from PM demo).
  const processing = artifact.status === "processing";
  const disabled = busy || processing;
  const can = (action: ConversationActionWire) => allowedActions.includes(action);

  const savedById = new Map(artifact.payload.items.map((i) => [i.itemId, i.persistedTaskId]));
  const isSaved = (itemId: string) => savedById.get(itemId) != null;
  const unsavedCount = items.filter((i) => !isSaved(i.itemId)).length;
  const multi = artifact.payload.items.length > 1;
  const editingItem = items.find((i) => i.itemId === editingId) ?? null;

  const removeItem = (itemId: string) => setItems((prev) => prev.filter((i) => i.itemId !== itemId));

  return (
    <View className="bg-white rounded-2xl p-4 mx-1 my-2 shadow-sm border border-gray-100">
      {multi && (
        <Text className="font-baloo text-xs text-primary mb-2">
          {t("draft.taskCount", { count: items.length })}
        </Text>
      )}

      {items.map((item, index) => {
        const saved = isSaved(item.itemId);
        return (
          <View
            key={item.itemId}
            className={`${index > 0 ? "border-t border-gray-100 pt-3 mt-3" : ""} ${saved ? "opacity-60" : ""}`}
          >
            <View className="flex-row items-start justify-between">
              <Text className="font-balooBold text-base text-secondary flex-1 pr-2">{item.title}</Text>
              {saved ? (
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              ) : (
                <View className="flex-row items-center gap-3">
                  <Pressable
                    hitSlop={8}
                    disabled={disabled}
                    onPress={() => setEditingId(item.itemId)}
                    accessibilityLabel={t("draft.edit")}
                  >
                    <Ionicons name="pencil" size={18} color="#8C8C8C" />
                  </Pressable>
                  {multi && items.length > 1 && (
                    <Pressable
                      hitSlop={8}
                      disabled={disabled}
                      onPress={() => removeItem(item.itemId)}
                      accessibilityLabel={t("draft.removeTask")}
                    >
                      <Ionicons name="close" size={20} color="#8C8C8C" />
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            <View className="flex-row items-center mt-2">
              <Ionicons name="calendar-outline" size={14} color="#8C8C8C" />
              <Text className="font-baloo text-sm text-primary ml-1">{item.date}</Text>
              <Ionicons name="time-outline" size={14} color="#8C8C8C" style={{ marginLeft: 12 }} />
              <Text className="font-baloo text-sm text-primary ml-1">
                {item.startTime} - {item.endTime}
              </Text>
            </View>

            {saved && (
              <Text className="font-baloo text-xs text-info mt-1">{t("draft.alreadySaved")}</Text>
            )}
          </View>
        );
      })}

      {artifact.payload.focusMinutes != null && (
        <Text className="font-baloo text-xs text-info mt-1">
          {t("draft.focusPreview", { minutes: artifact.payload.focusMinutes })}
        </Text>
      )}

      {processing ? (
        <View className="items-center py-3">
          <ActivityIndicator />
        </View>
      ) : (
        <View className={`mt-3 ${disabled ? "opacity-50" : ""}`}>
          {can("start_now") && (
            <Pressable
              className="bg-highlight rounded-xl py-3 items-center"
              disabled={disabled}
              onPress={() => onConfirm("start_now", { items })}
            >
              <Text className="font-balooBold text-white text-base">{t("draft.startNow")}</Text>
            </Pressable>
          )}

          <View className="flex-row gap-2 mt-2">
            {can("add_to_task_list") && (
              <Pressable
                className={`flex-1 rounded-xl py-2 items-center ${
                  can("start_now") ? "border border-gray-300" : "bg-highlight"
                }`}
                disabled={disabled || unsavedCount === 0}
                onPress={() => onConfirm("add_to_task_list", { items })}
              >
                <Text
                  className={`font-balooBold text-sm ${can("start_now") ? "text-secondary" : "text-white"}`}
                >
                  {multi
                    ? t("draft.addAllToTaskList", { count: unsavedCount })
                    : t("draft.addToTaskList")}
                </Text>
              </Pressable>
            )}
          </View>

          {can("reject_draft") && (
            <Pressable className="items-center py-2 mt-1" disabled={disabled} onPress={onReject}>
              <Text className="font-baloo text-primary text-xs underline">
                {multi ? t("draft.rejectAll") : t("draft.reject")}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {editingItem && (
        <DraftEditModal
          visible
          initial={editingItem}
          onCancel={() => setEditingId(null)}
          onSave={(next) => {
            setItems((prev) => prev.map((i) => (i.itemId === next.itemId ? next : i)));
            setEditingId(null);
          }}
        />
      )}
    </View>
  );
}

function toEdited(artifact: ArtifactEnvelopeDto): EditedDraftItemDto[] {
  return artifact.payload.items.map(toEditedItem);
}

function toEditedItem(p: TaskDraftItemDto): EditedDraftItemDto {
  return {
    itemId: p.itemId,
    title: p.title,
    description: p.description,
    date: p.date,
    startTime: p.startTime,
    endTime: p.endTime,
    timeZoneId: p.timeZoneId,
    labelId: p.labelId,
  };
}

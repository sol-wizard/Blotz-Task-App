import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { fromZonedTime } from "date-fns-tz";
import {
  ArtifactEnvelopeDto,
  EditedDraftItemDto,
  EditedNoteDraftItemDto,
} from "../models/ai-coach-dto";
import { ReviewItem, toReviewItem } from "../models/review-list";
import { ConfirmOutcome } from "../hooks/useAiCoachChat";
import { DraftEditModal } from "./draft-edit-modal";
import { ReviewNoteEditor } from "./review-note-editor";

export function ReviewListModal({
  visible,
  list,
  conversationVersion,
  busy,
  generating = false,
  uncertain,
  onClose,
  onEdit,
  onRemove,
  onConfirm,
  onRefresh,
}: {
  visible: boolean;
  list: ArtifactEnvelopeDto | null;
  conversationVersion: number;
  busy: boolean;
  generating?: boolean;
  uncertain: boolean;
  onClose: () => void;
  onEdit: (
    list: ArtifactEnvelopeDto,
    version: number,
    item: EditedDraftItemDto | EditedNoteDraftItemDto,
  ) => Promise<string | null>;
  onRemove: (itemId: string) => Promise<string | null>;
  onConfirm: (allowConflict?: boolean, token?: string | null) => Promise<ConfirmOutcome>;
  onRefresh: () => Promise<void>;
}) {
  const { t } = useTranslation("aiCoach");
  const [editing, setEditing] = useState<{
    item: ReviewItem;
    list: ArtifactEnvelopeDto;
    version: number;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [visible]);

  const message = (code: string) => {
    switch (code.split(":")[0]) {
      case "StaleDraftVersion":
      case "StaleConversationVersion":
        return t("review.changed");
      case "ScheduleRequired":
        return t("draft.scheduleRequired");
      case "ScheduleInPast":
        return t("draft.timePassed");
      case "ScheduleUnverified":
        return t("draft.scheduleUnverified");
      case "ScheduleConflict":
        return t("draft.scheduleChanged");
      case "InvalidDraftFields":
        return t("review.invalidFields");
      case "ConfirmationUnknown":
        return t("review.confirmationUnknown");
      default:
        return t("review.saveFailed");
    }
  };
  const cancelEdit = () => {
    setEditing(null);
    setDirty(false);
    setError(null);
  };
  const close = () => {
    if (editing && busy) return;
    const leave = () => {
      cancelEdit();
      onClose();
    };
    if (!dirty) {
      leave();
      return;
    }
    Alert.alert(t("review.discardEditTitle"), t("review.discardEditDescription"), [
      { text: t("review.keepEditing"), style: "cancel" },
      { text: t("review.discardEdit"), style: "destructive", onPress: leave },
    ]);
  };
  const saveEdit = async (item: EditedDraftItemDto | EditedNoteDraftItemDto) => {
    if (!editing) return;
    const code = await onEdit(editing.list, editing.version, item);
    if (code) setError(message(code));
    else cancelEdit();
  };
  const remove = async (itemId: string) => {
    setError(null);
    const code = await onRemove(itemId);
    if (code) setError(message(code));
  };
  const confirm = async (allowConflict = false, token?: string | null): Promise<void> => {
    setError(null);
    const result = await onConfirm(allowConflict, token);
    if (!result.errorCode) {
      Toast.show({ type: "success", text1: t("review.saved") });
      close();
      return;
    }
    if (result.errorCode === "ScheduleConflict" && result.scheduleAssessment?.conflictToken) {
      const assessment = result.scheduleAssessment;
      Alert.alert(
        t("draft.scheduleConflictTitle"),
        t("draft.scheduleConflictConfirm") +
          "\n" +
          t("draft.scheduleConflict", {
            tasks: [...new Set(assessment.conflicts.map((item) => item.taskTitle))].join(", "),
          }),
        [
          { text: t("draft.cancel"), style: "cancel" },
          {
            text: t("draft.saveDespiteConflict"),
            onPress: () => void confirm(true, assessment.conflictToken),
          },
        ],
      );
    } else setError(message(result.errorCode));
  };
  const errors = list?.validationErrors ?? [];
  const tasks = list?.payload.items.filter((item) => item.kind !== "note") ?? [];
  const past = tasks.some(
    (item) =>
      item.date &&
      item.startTime &&
      fromZonedTime(`${item.date}T${item.startTime}:00`, item.timeZoneId).getTime() < now,
  );
  const incomplete = tasks.some((item) => !item.date || !item.startTime || !item.endTime);
  const unverified = list?.schedule?.status === "unverified";
  const invalid = errors.some(
    (code) => !["ScheduleConflict", "ScheduleUnverified"].includes(code.split(":")[0]),
  );
  const disabled =
    busy || generating ||
    (!uncertain &&
      (!list || list.status !== "pending" || past || incomplete || invalid || unverified));
  const editingStale =
    !!editing &&
    (editing.list.id !== list?.id ||
      editing.list.version !== list.version ||
      editing.version !== conversationVersion);
  const editorBusy = busy || uncertain || generating;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        className="flex-1 bg-black/40 justify-center px-5"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {editing ? (
          <>
            {(editingStale || error) && (
              <View className="bg-white rounded-xl p-3 mb-2">
                <Text accessibilityRole="alert" className="font-baloo text-warning">
                  {error ?? t("review.changedWhileEditing")}
                </Text>
              </View>
            )}
            {editing.item.kind === "task" ? (
              <DraftEditModal
                key={editing.item.fields.itemId}
                visible
                embedded
                initial={editing.item.fields}
                busy={editorBusy}
                onCancel={cancelEdit}
                onSave={(item) => void saveEdit(item)}
                onDirtyChange={setDirty}
              />
            ) : (
              <ReviewNoteEditor
                key={editing.item.fields.itemId}
                initial={editing.item.fields}
                busy={editorBusy}
                onCancel={cancelEdit}
                onSave={(item) => void saveEdit(item)}
                onDirtyChange={setDirty}
              />
            )}
          </>
        ) : (
          <View className="bg-white rounded-2xl p-5 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-balooBold text-lg text-secondary">{t("review.title")}</Text>
              <Pressable onPress={close} accessibilityRole="button" hitSlop={12}>
                <Text className="font-baloo text-primary">{t("review.close")}</Text>
              </Pressable>
            </View>
            <Text className="font-baloo text-sm text-primary mb-3">{t("review.explanation")}</Text>
            {generating && <Text accessibilityLiveRegion="polite" className="font-baloo text-sm text-info mb-3">
              {t("review.generatingDescription")}
            </Text>}
            <ScrollView keyboardShouldPersistTaps="handled">
              {!list && <Text className="font-baloo text-secondary py-6">{t("review.empty")}</Text>}
              {list?.payload.items.map((item) => {
                const note = item.kind === "note";
                const itemErrors = errors.filter((code) => code.endsWith(`:${item.itemId}`));
                return (
                  <View key={item.itemId} className="border border-gray-200 rounded-xl p-3 mb-3">
                    <Text className="font-baloo text-xs text-info mb-1">
                      {t(note ? "review.note" : "review.task")}
                    </Text>
                    <Text className="font-balooBold text-base text-secondary">{item.title}</Text>
                    {item.description && (
                      <Pressable accessibilityRole="button" accessibilityLabel={t("review.toggleDetails")}
                        accessibilityState={{ expanded: expanded.has(item.itemId) }}
                        onPress={() => setExpanded(previous => {
                          const next = new Set(previous);
                          if (next.has(item.itemId)) next.delete(item.itemId);
                          else next.add(item.itemId);
                          return next;
                        })}>
                        <Text className="font-baloo text-secondary text-sm mt-1" numberOfLines={expanded.has(item.itemId) ? undefined : 4}>
                          {item.description}
                        </Text>
                      </Pressable>
                    )}
                    {!note && (
                      <>
                        <Text className="font-baloo text-primary text-sm mt-2">
                          {item.date ?? t("draft.datePending")} · {item.startTime ?? "—"} –{" "}
                          {item.endTime ?? "—"}
                        </Text>
                        <Text className="font-baloo text-primary text-xs">{item.timeZoneId}</Text>
                        {!!item.suggestedFields?.length && (
                          <Text className="font-baloo text-info text-xs mt-1">
                            {t("review.suggested", {
                              fields: item.suggestedFields
                                .map((field) => t(`editModal.${field}`))
                                .join(", "),
                            })}
                          </Text>
                        )}
                        {item.recurrence && (
                          <Text className="font-baloo text-info text-xs mt-1">
                            {t("draft.repeats")} ·{" "}
                            {t(`editModal.frequency.${item.recurrence.frequency}`)}
                            {item.recurrence.interval > 1 ? ` × ${item.recurrence.interval}` : ""}
                          </Text>
                        )}
                      </>
                    )}
                    {itemErrors.map((code) => (
                      <Text key={code} className="font-baloo text-warning text-xs mt-1">
                        {message(code)}
                      </Text>
                    ))}
                    <View className="flex-row gap-5 mt-3">
                      <Pressable
                        disabled={editorBusy || list.status !== "pending"}
                        accessibilityRole="button"
                        accessibilityLabel={t("review.editItem", { title: item.title })}
                        onPress={() => {
                          setError(null);
                          setDirty(false);
                          setEditing({
                            item: toReviewItem(item),
                            list,
                            version: conversationVersion,
                          });
                        }}
                      >
                        <Text
                          className={`font-balooBold text-info ${editorBusy ? "opacity-40" : ""}`}
                        >
                          {t("draft.edit")}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={editorBusy || list.status !== "pending"}
                        accessibilityRole="button"
                        accessibilityLabel={t("review.removeItem", { title: item.title })}
                        onPress={() => void remove(item.itemId)}
                      >
                        <Text
                          className={`font-baloo text-warning ${editorBusy ? "opacity-40" : ""}`}
                        >
                          {t("review.remove")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              {list?.schedule?.status === "conflict" && (
                <Text className="font-baloo text-warning text-sm mb-2">
                  {t("draft.scheduleConflict", {
                    tasks: [...new Set(list.schedule.conflicts.map((item) => item.taskTitle))].join(
                      ", ",
                    ),
                  })}
                </Text>
              )}
              {unverified && (
                <Text className="font-baloo text-warning text-sm mb-2">
                  {t("draft.scheduleUnverified")}
                </Text>
              )}
              {list?.schedule?.status === "partial" && (
                <Text className="font-baloo text-info text-xs mb-2">
                  {t("draft.schedulePartial")}
                </Text>
              )}
              {(uncertain || error) && (
                <Text accessibilityRole="alert" className="font-baloo text-warning text-sm mb-2">
                  {uncertain ? t("review.confirmationUnknown") : error}
                </Text>
              )}
              {past && (
                <Text className="font-baloo text-warning text-sm mb-2">
                  {t("draft.timePassed")}
                </Text>
              )}
            </ScrollView>
            {(unverified || uncertain) && (
              <Pressable
                disabled={busy || generating}
                onPress={() => void onRefresh()}
                className="items-center py-2"
              >
                <Text className="font-baloo text-info">{t("review.refresh")}</Text>
              </Pressable>
            )}
            {(list || uncertain) && (
              <Pressable
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                onPress={() => void confirm()}
                className={`bg-highlight rounded-xl py-3 items-center mt-3 ${disabled ? "opacity-40" : ""}`}
              >
                {generating ? (
                  <Text className="font-balooBold text-white text-base">{t("review.generating")}</Text>
                ) : busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-balooBold text-white text-base">
                    {uncertain
                      ? t("review.retrySave")
                      : t("review.addAll", { count: list?.payload.items.length ?? 0 })}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

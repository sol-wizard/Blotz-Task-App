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
import Ionicons from "@react-native-vector-icons/ionicons/static";
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
import { CoachChip } from "./coach-chip";
import { formatDraftWhen, formatRecurrence } from "../utils/draft-format";

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
  const { t, i18n } = useTranslation("aiCoach");
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
  const notes = list?.payload.items.filter((item) => item.kind === "note") ?? [];
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Per-item problems sit on the row; list-wide ones collect above the save button.
  const notices: { tone: "warning" | "info"; text: string; alert?: boolean }[] = [];
  const unmatchedConflicts = list?.schedule?.status === "conflict"
    ? list.schedule.conflicts.filter((entry) => !list.payload.items.some((item) => item.itemId === entry.itemId))
    : [];
  if (unmatchedConflicts.length > 0) notices.push({ tone: "warning",
    text: t("draft.scheduleConflict", { tasks: [...new Set(unmatchedConflicts.map((item) => item.taskTitle))].join(", ") }) });
  if (unverified) notices.push({ tone: "warning", text: t("draft.scheduleUnverified") });
  if (list?.schedule?.status === "partial") notices.push({ tone: "info", text: t("draft.schedulePartial") });
  if (past) notices.push({ tone: "warning", text: t("draft.timePassed") });
  if (uncertain || error) notices.push({ tone: "warning", alert: true,
    text: uncertain ? t("review.confirmationUnknown") : error ?? "" });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        className={`flex-1 bg-black/40 ${editing ? "justify-center px-5" : "justify-end"}`}
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
          <View className="bg-white rounded-t-[28px] max-h-[88%]">
            <View className="w-10 h-[5px] rounded-full bg-[#E0E3E7] self-center mt-2 mb-1" />
            <View className="px-5 pt-1.5 pb-2">
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 font-balooExtraBold text-[22px] leading-7 text-secondary">
                  {t("review.title")}{list ? ` · ${list.payload.items.length}` : ""}
                </Text>
                <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t("review.close")} hitSlop={12}
                  className="w-8 h-8 rounded-full bg-[#F3F5F7] items-center justify-center">
                  <Ionicons name="close" size={16} color="#444964" />
                </Pressable>
              </View>
              <Text className="font-baloo text-sm text-[#6B7280]">{t("review.explanation")}</Text>
              {generating && <View className="flex-row items-center gap-2 rounded-xl bg-[#EAF3FC] px-3 py-2 mt-2">
                <ActivityIndicator size="small" color="#3D8DE0" />
                <Text accessibilityLiveRegion="polite" className="flex-1 font-baloo text-sm text-info">
                  {t("review.generatingDescription")}
                </Text>
              </View>}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-2">
              {!list && <Text className="font-baloo text-[#6B7280] text-center py-6">{t("review.empty")}</Text>}
              {list && ([["task", tasks], ["note", notes]] as const).map(([kind, group]) => group.length > 0 && (
                <View key={kind}>
                  <Text className="font-inter font-semibold text-xs text-[#6B7280] pt-3 pb-0.5">
                    {t(kind === "note" ? "review.note" : "review.task")} · {group.length}
                  </Text>
                  {group.map((item, index) => {
                    const note = item.kind === "note";
                    const itemErrors = errors.filter((code) => code.endsWith(`:${item.itemId}`));
                    const when = note ? null : formatDraftWhen(item, t, i18n.resolvedLanguage ?? i18n.language);
                    const rowDisabled = editorBusy || list.status !== "pending";
                    const conflicts = note ? [] : [...new Set((list.schedule?.status === "conflict" ? list.schedule.conflicts : [])
                      .filter((entry) => entry.itemId === item.itemId).map((entry) => entry.taskTitle))];
                    return (
                      <View key={item.itemId}
                        className={`flex-row items-start gap-3 py-3 ${index > 0 ? "border-t border-[#EEF1F3]" : ""}`}>
                        <View className={`w-[34px] h-[34px] rounded-[11px] items-center justify-center ${
                          note ? "bg-[#FFF7ED]" : "bg-[#EAF3FC]"}`}>
                          <Ionicons name={note ? "document-text-outline" : "checkmark-circle-outline"} size={18}
                            color={note ? "#F59E0B" : "#3D8DE0"} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-inter font-semibold text-base text-secondary">{item.title}</Text>
                          {item.description && (
                            <Pressable accessibilityRole="button" accessibilityLabel={t("review.toggleDetails")}
                              accessibilityState={{ expanded: expanded.has(item.itemId) }}
                              onPress={() => setExpanded(previous => {
                                const next = new Set(previous);
                                if (next.has(item.itemId)) next.delete(item.itemId);
                                else next.add(item.itemId);
                                return next;
                              })}>
                              <Text className="font-baloo text-[#6B7280] text-sm mt-0.5"
                                numberOfLines={expanded.has(item.itemId) ? undefined : 2}>
                                {item.description}
                              </Text>
                            </Pressable>
                          )}
                          {!note && (
                            <View className="flex-row flex-wrap gap-1.5 mt-1.5">
                              {when ? <CoachChip label={when} icon="time-outline" />
                                : <CoachChip label={t("draft.datePending")} tone="info" icon="calendar-outline" />}
                              {item.recurrence && <CoachChip label={formatRecurrence(item.recurrence, t)} tone="info" icon="repeat" />}
                              {item.timeZoneId !== deviceTimeZone && <CoachChip label={item.timeZoneId} icon="globe-outline" />}
                              {!!item.suggestedFields?.length && (
                                <CoachChip tone="info" icon="bulb-outline" label={t("review.suggested", {
                                  fields: item.suggestedFields.map((field) => t(`editModal.${field}`)).join(", "),
                                })} />
                              )}
                              {conflicts.map((title) => (
                                <CoachChip key={title} label={t("draft.conflictWith", { task: title })} tone="warning"
                                  icon="alert-circle-outline" />
                              ))}
                            </View>
                          )}
                          {itemErrors.map((code) => (
                            <Text key={code} className="font-baloo text-[#C2410C] text-xs mt-1">{message(code)}</Text>
                          ))}
                        </View>
                        <View className={`flex-row gap-1.5 ${rowDisabled ? "opacity-40" : ""}`}>
                          <Pressable
                            disabled={rowDisabled}
                            accessibilityRole="button"
                            accessibilityLabel={t("review.editItem", { title: item.title })}
                            className="w-8 h-8 rounded-full bg-[#F3F5F7] items-center justify-center"
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
                            <Ionicons name="pencil" size={14} color="#8C8C8C" />
                          </Pressable>
                          <Pressable
                            disabled={rowDisabled}
                            accessibilityRole="button"
                            accessibilityLabel={t("review.removeItem", { title: item.title })}
                            className="w-8 h-8 rounded-full bg-[#F3F5F7] items-center justify-center"
                            onPress={() => void remove(item.itemId)}
                          >
                            <Ionicons name="trash-outline" size={14} color="#8C8C8C" />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            <View className="px-5 pt-2.5 pb-8 border-t border-[#EEF1F3] gap-2">
              {notices.map((notice) => (
                <View key={notice.text} accessibilityRole={notice.alert ? "alert" : undefined}
                  className={`flex-row items-start gap-2 rounded-xl px-3 py-2 ${notice.tone === "warning" ? "bg-[#FFF7ED]" : "bg-[#EAF3FC]"}`}>
                  <Ionicons name={notice.tone === "warning" ? "warning-outline" : "information-circle-outline"} size={15}
                    color={notice.tone === "warning" ? "#C2410C" : "#3D8DE0"} style={{ marginTop: 1 }} />
                  <Text className={`flex-1 font-baloo text-sm ${notice.tone === "warning" ? "text-[#C2410C]" : "text-info"}`}>
                    {notice.text}
                  </Text>
                </View>
              ))}
              {(unverified || uncertain) && (
                <Pressable
                  disabled={busy || generating}
                  onPress={() => void onRefresh()}
                  className="items-center py-1.5"
                >
                  <Text className="font-balooBold text-info">{t("review.refresh")}</Text>
                </Pressable>
              )}
              {(list || uncertain) && (
                <Pressable
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityState={{ disabled }}
                  onPress={() => void confirm()}
                  className={`bg-highlight rounded-[14px] py-3.5 items-center ${disabled ? "opacity-40" : ""}`}
                >
                  {generating ? (
                    <Text className="font-balooBold text-[#2F3347] text-base">{t("review.generating")}</Text>
                  ) : busy ? (
                    <ActivityIndicator color="#2F3347" />
                  ) : (
                    <Text className="font-balooBold text-[#2F3347] text-base">
                      {uncertain
                        ? t("review.retrySave")
                        : t("review.addAll", { count: list?.payload.items.length ?? 0 })}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

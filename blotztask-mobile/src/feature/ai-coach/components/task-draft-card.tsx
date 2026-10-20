import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import Toast from "react-native-toast-message";
import { ArtifactEnvelopeDto, EditedDraftDto, EditedDraftItemDto, TaskDraftItemDto } from "../models/ai-coach-dto";
import { ConfirmAction } from "../hooks/useAiCoachChat";
import { DraftEditModal } from "./draft-edit-modal";
import { CoachChip } from "./coach-chip";
import { formatDraftWhen, formatRecurrence } from "../utils/draft-format";
import TasksCheckbox from "@/shared/components/task-checkbox";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { theme } from "@/shared/constants/theme";
import { fromZonedTime } from "date-fns-tz";

/** Each card has its own lifecycle. Editor changes are saved before the next chat turn. */
export function TaskDraftCard({
  artifact,
  busy,
  onConfirm,
  onReject,
  onEdit,
  readOnly = false,
}: {
  artifact: ArtifactEnvelopeDto;
  busy: boolean;
  readOnly?: boolean;
  onConfirm: (action: ConfirmAction, edited: EditedDraftDto, selectedItemIds: string[], allowScheduleConflict?: boolean,
    acceptedConflictToken?: string | null) => void;
  onReject: () => void;
  onEdit: (edited: EditedDraftDto) => Promise<string | null>;
}) {
  const { t, i18n } = useTranslation("aiCoach");
  const { labels } = useAllLabels();
  const [editingId, setEditingId] = useState<string | null>(null);
  const items: TaskDraftItemDto[] = artifact.payload.items;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(
    items.filter((item) => item.persistedTaskId == null).map((item) => item.itemId),
  ));
  const editable = artifact.status === "pending" && !readOnly;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!editable) return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [editable]);
  const disabled = busy || !editable || !artifact.allowedActions.includes("edit_draft");
  const can = (action: "start_now" | "add_to_task_list" | "reject_draft") =>
    artifact.allowedActions.includes(action);
  const saved = (id: string) =>
    artifact.payload.items.find((item) => item.itemId === id)?.persistedTaskId != null;
  const selected = items.filter((item) => !saved(item.itemId) && selectedIds.has(item.itemId));
  const unsavedCount = items.filter((item) => !saved(item.itemId)).length;
  const scheduled = selected.length > 0 && selected.every(
    (item) => item.date && item.startTime && item.endTime &&
      (!item.recurrence || (item.recurrence.interval >= 1 &&
        (item.recurrence.frequency !== "Weekly" || !!item.recurrence.daysOfWeek) &&
        (!item.recurrence.endDate || item.recurrence.endDate >= item.date))),
  );
  const editingItem = items.find((item) => item.itemId === editingId);
  const isPast = (item: TaskDraftItemDto) => !!item.date && !!item.startTime &&
    fromZonedTime(`${item.date}T${item.startTime}:00`, item.timeZoneId).getTime() < now;
  const hasPastTime = selected.some(isPast);
  const confirmAction = (action: ConfirmAction) => {
    const selectedItemIds = action === "start_now" ? [items[0].itemId]
      : selected.map((item) => item.itemId);
    onConfirm(action, { items }, selectedItemIds);
  };

  const saveEdit = async (next: EditedDraftItemDto[]) => {
    const error = await onEdit({ items: next });
    if (error) {
      Toast.show({ type: "error", text1: t("draft.editFailed") });
      return;
    }
    setEditingId(null);
  };

  const selectable = editable && can("add_to_task_list") && items.length > 1;
  const showConflicts = editable && selected.length === unsavedCount && artifact.schedule?.status === "conflict";
  const conflictsFor = (itemId: string) => showConflicts
    ? [...new Set(artifact.schedule?.conflicts.filter((entry) => entry.itemId === itemId).map((entry) => entry.taskTitle))]
    : [];
  // Conflicts the server could not pin to a draft row still need a card-level notice.
  const unmatchedConflicts = showConflicts
    ? (artifact.schedule?.conflicts ?? []).filter((entry) => !items.some((item) => item.itemId === entry.itemId))
    : [];
  const inactive = artifact.status === "rejected" || artifact.status === "expired";
  const language = i18n.resolvedLanguage ?? i18n.language;
  // When every task falls on one day, the header names it once instead of repeating it per row.
  const sharedDay = items.every((item) => item.date && item.date === items[0].date)
    ? formatDraftWhen({ date: items[0].date, startTime: null, endTime: null }, t, language) : null;
  const header = artifact.status === "completed" ? { text: t("draft.alreadySaved"), icon: "checkmark" as const }
    : artifact.status === "rejected" ? { text: t("draft.discarded"), icon: "close" as const }
    : artifact.status === "expired" ? { text: t("draft.expired"), icon: "time-outline" as const }
    : { text: [sharedDay, t("draft.taskCount", { count: items.length })].filter(Boolean).join(" · "), icon: null };

  // Card-level notices; per-task problems sit on the task row as chips.
  const notices: { tone: "warning" | "info"; text: string }[] = [];
  if (editable && selected.length > 0 && !scheduled) notices.push({ tone: "info", text: t("draft.scheduleRequired") });
  if (unmatchedConflicts.length > 0) notices.push({ tone: "warning",
    text: t("draft.scheduleConflict", { tasks: unmatchedConflicts.map((entry) => entry.taskTitle).join("、") }) });
  if (editable && selected.length === unsavedCount && artifact.schedule?.status === "unverified") {
    notices.push({ tone: "warning", text: t("draft.scheduleUnverified") });
  }
  if (editable && artifact.schedule && items.some((item) => item.recurrence != null)) {
    notices.push({ tone: "info", text: t("draft.schedulePartial") });
  }
  if (artifact.saveError) notices.push({ tone: "warning", text: t("draft.saveFailed") });

  const showStart = can("start_now");
  const addLabel = items.length > 1
    ? t("draft.addSelectedToTaskList", { count: selected.length })
    : t("draft.addToTaskList");
  const rejectLabel = items.length > 1 ? t("draft.rejectAll") : t("draft.reject");

  return (
    <View className={`bg-white rounded-[22px] px-3.5 pt-3.5 pb-3 my-2 gap-1 ${inactive ? "opacity-60" : ""}`}
      style={{ boxShadow: "0 1px 2px rgba(68, 73, 100, 0.06)" }}>
      <View className="flex-row items-center gap-2 px-0.5 pb-1.5">
        {header.icon && (
          <View className={`w-7 h-7 rounded-[9px] items-center justify-center ${inactive ? "bg-[#F3F5F7]" : "bg-[#F1F9E1]"}`}>
            <Ionicons name={header.icon} size={15} color={inactive ? theme.colors.primary : theme.colors.checked} />
          </View>
        )}
        <Text className={`flex-1 font-balooBold text-base ${inactive ? "text-primary" : "text-secondary"}`}>
          {header.text}
        </Text>
        {selectable && unsavedCount > 1 && (
          <Pressable disabled={disabled} hitSlop={8} onPress={() => setSelectedIds(selected.length === unsavedCount
            ? new Set() : new Set(items.filter((item) => !saved(item.itemId)).map((item) => item.itemId)))}>
            <Text className="font-inter font-semibold text-xs text-[#4D7300]">
              {selected.length === unsavedCount ? t("draft.clearSelection") : t("draft.selectAll")}
            </Text>
          </Pressable>
        )}
      </View>

      {items.map((item, index) => {
        const isSaved = saved(item.itemId);
        const isSelected = selectedIds.has(item.itemId);
        const dimmed = selectable && !isSaved && !isSelected;
        const day = sharedDay ? null : formatDraftWhen({ ...item, startTime: null, endTime: null }, t, language);
        const labelColor = labels.find((label) => label.labelId === item.labelId)?.color ?? theme.colors.disabled;
        const canEditRow = editable && !isSaved;
        return (
          <View key={item.itemId} className="flex-row items-center gap-3 rounded-[14px] bg-[#F7F9FA] px-3 py-2.5">
            {isSaved ? (
              <View className="w-[22px] h-[22px] rounded-full bg-checked items-center justify-center">
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
            ) : selectable && (
              <TasksCheckbox
                type="task"
                checked={isSelected}
                disabled={disabled}
                onChange={() => setSelectedIds((previous) => {
                  const next = new Set(previous);
                  if (next.has(item.itemId)) next.delete(item.itemId);
                  else next.add(item.itemId);
                  return next;
                })}
              />
            )}
            <View className="w-11">
              <Text className={`font-inter font-semibold text-sm ${dimmed || inactive ? "text-neutral-400" : "text-secondary"}`}
                style={{ fontVariant: ["tabular-nums"] }}>{item.startTime ?? "--:--"}</Text>
              {item.endTime && <Text className="font-inter text-xs text-[#6B7280]"
                style={{ fontVariant: ["tabular-nums"] }}>{item.endTime}</Text>}
            </View>
            <View className="w-[3px] self-stretch rounded-full" style={{ backgroundColor: labelColor }} />
            <Pressable
              className="flex-1"
              disabled={!canEditRow || disabled}
              onPress={() => setEditingId(item.itemId)}
              accessibilityRole={canEditRow ? "button" : undefined}
              accessibilityLabel={canEditRow ? `${t("draft.edit")}: ${item.title}` : undefined}
            >
              <Text
                className={`font-inter font-semibold text-base ${dimmed || inactive ? "text-neutral-400" : "text-secondary"}`}
                style={inactive ? { textDecorationLine: "line-through" } : undefined}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {item.description && (
                <Text className="font-baloo text-sm text-[#6B7280]" numberOfLines={2}>{item.description}</Text>
              )}
              <View className="flex-row flex-wrap gap-1.5 mt-1">
                {day && <CoachChip label={day} icon="calendar-outline" />}
                {!item.date && <CoachChip label={t("draft.datePending")} tone="info" icon="calendar-outline" />}
                {item.recurrence && <CoachChip label={formatRecurrence(item.recurrence, t)} tone="info" icon="repeat" />}
                {items.length === 1 && artifact.payload.focusMinutes != null && editable && (
                  <CoachChip label={t("draft.focusPreview", { minutes: artifact.payload.focusMinutes })} tone="success"
                    icon="flame-outline" />
                )}
                {editable && !isSaved && isSelected && isPast(item) && (
                  <CoachChip label={t("draft.timePassedShort")} tone="warning" icon="alert-circle-outline" />
                )}
                {conflictsFor(item.itemId).map((title) => (
                  <CoachChip key={title} label={t("draft.conflictWith", { task: title })} tone="warning"
                    icon="alert-circle-outline" />
                ))}
              </View>
            </Pressable>
            {canEditRow && items.length > 1 ? (
              <Pressable
                hitSlop={8}
                disabled={disabled}
                onPress={() => void saveEdit(items.filter((entry) => entry.itemId !== item.itemId))}
                accessibilityLabel={t("draft.removeTask")}
              >
                <Ionicons name="close" size={18} color="#8A8F9C" />
              </Pressable>
            ) : canEditRow && (
              <Ionicons name="chevron-forward" size={16} color="#8A8F9C" />
            )}
          </View>
        );
      })}

      {notices.map((notice) => (
        <View key={notice.text}
          className={`flex-row items-start gap-2 rounded-xl px-3 py-2 mt-1.5 ${notice.tone === "warning" ? "bg-[#FFF7ED]" : "bg-[#EAF3FC]"}`}>
          <Ionicons name={notice.tone === "warning" ? "warning-outline" : "information-circle-outline"} size={15}
            color={notice.tone === "warning" ? "#C2410C" : "#3D8DE0"} style={{ marginTop: 1 }} />
          <Text className={`flex-1 font-inter text-xs ${notice.tone === "warning" ? "text-[#C2410C]" : "text-info"}`}>
            {notice.text}
          </Text>
        </View>
      ))}

      {artifact.status === "processing" ? (
        <View className="mt-3"><ActivityIndicator /></View>
      ) : (
        editable && (
          <View className={`mt-2 gap-1 ${disabled ? "opacity-50" : ""}`}>
            <View className="flex-row items-center gap-2">
              {!showStart && can("reject_draft") && (
                <Pressable className="px-3 py-3" disabled={disabled} onPress={onReject}>
                  <Text className="font-inter font-medium text-sm text-[#6B7280]">{rejectLabel}</Text>
                </Pressable>
              )}
              {can("add_to_task_list") && (
                <Pressable
                  className={`flex-1 rounded-[14px] h-11 items-center justify-center ${showStart ? "bg-[#F1F9E1]" : "bg-highlight"} ${
                    !scheduled || hasPastTime ? "opacity-40" : ""}`}
                  disabled={disabled || !scheduled || hasPastTime}
                  onPress={() => confirmAction("add_to_task_list")}
                >
                  <Text className={`font-balooBold text-base ${showStart ? "text-[#4D7300]" : "text-[#2F3347]"}`}>{addLabel}</Text>
                </Pressable>
              )}
              {showStart && (
                <Pressable
                  className={`flex-1 bg-highlight rounded-[14px] h-11 flex-row items-center justify-center gap-1.5 ${
                    !scheduled ? "opacity-40" : ""}`}
                  disabled={disabled || !scheduled}
                  onPress={() => confirmAction("start_now")}
                >
                  <Ionicons name="play" size={14} color="#2F3347" />
                  <Text className="font-balooBold text-[#2F3347] text-base">{t("draft.startNow")}</Text>
                </Pressable>
              )}
            </View>
            {showStart && can("reject_draft") && (
              <Pressable className="items-center py-1.5" disabled={disabled} onPress={onReject}>
                <Text className="font-inter font-medium text-sm text-[#6B7280]">{rejectLabel}</Text>
              </Pressable>
            )}
          </View>
        )
      )}
      {editingItem && editable && (
        <DraftEditModal
          key={`${artifact.id}:${artifact.version}:${editingItem.itemId}`}
          visible
          initial={editingItem}
          busy={disabled}
          onCancel={() => setEditingId(null)}
          onSave={(next) =>
            void saveEdit(items.map((item) => (item.itemId === next.itemId ? next : item)))
          }
        />
      )}
    </View>
  );
}

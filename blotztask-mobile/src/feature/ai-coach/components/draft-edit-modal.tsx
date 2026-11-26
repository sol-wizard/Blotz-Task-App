import { useState, type ComponentProps } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import TimePicker from "@/feature/task-add-edit/components/time-picker";
import { DraftRecurrenceDto, EditedDraftItemDto } from "../models/ai-coach-dto";
import {
  clampDate, draftDateBounds, draftLength, fillDraftTimes, formatDraftWhen, formatDuration, shiftEnd,
} from "../utils/draft-format";
import { DraftDateWheels, WheelBand } from "./draft-date-wheels";

type Picker = "date" | "time" | "endDate";
type IconName = ComponentProps<typeof Ionicons>["name"];

const weekdays = [1, 2, 4, 8, 16, 32, 64] as const;
const frequencies: DraftRecurrenceDto["frequency"][] = ["Daily", "Weekly", "Monthly", "Yearly"];

/** The time wheels only read hours and minutes, so any day works. */
const timeAsDate = (time: string) => new Date(`2000-01-01T${time}:00`);

/**
 * Bottom sheet to edit a suggested task before it is saved. Scheduling fields may stay unset; opening the
 * date or time picker fills its field, so what the wheels show is what ✓ saves. "Ends on" is the exception:
 * an empty one stays empty until a wheel moves, since filling it would end the series.
 */
export function DraftEditModal({
  visible,
  initial,
  busy,
  onCancel,
  onSave,
}: {
  visible: boolean;
  initial: EditedDraftItemDto;
  busy: boolean;
  onCancel: () => void;
  onSave: (edited: EditedDraftItemDto) => void;
}) {
  const { t, i18n } = useTranslation("aiCoach");
  const insets = useSafeAreaInsets();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [bounds] = useState(() => draftDateBounds());
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [recurrence, setRecurrence] = useState(initial.recurrence);
  const [open, setOpen] = useState<Picker | null>(null);
  // Bumped when the start wheel moves the end, so the end wheel remounts at its new value.
  const [endWheelKey, setEndWheelKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const dirty = title !== initial.title || description !== (initial.description ?? "") || date !== initial.date ||
    startTime !== initial.startTime || endTime !== initial.endTime || JSON.stringify(recurrence) !== JSON.stringify(initial.recurrence);
  const cancel = () => {
    if (busy) return;
    if (!dirty) { onCancel(); return; }
    Alert.alert(t("review.discardEditTitle"), t("review.discardEditDescription"), [
      { text: t("review.keepEditing"), style: "cancel" },
      { text: t("review.discardEdit"), style: "destructive", onPress: onCancel },
    ]);
  };

  const save = () => {
    if (!title.trim()) {
      setError(t("editModal.titleRequired"));
      return;
    }
    if (startTime && endTime && endTime <= startTime) {
      setError(t("editModal.endBeforeStart"));
      return;
    }
    if (recurrence) {
      if (recurrence.interval < 1 || !Number.isInteger(recurrence.interval) ||
          (recurrence.frequency === "Weekly" && !recurrence.daysOfWeek) ||
          (recurrence.frequency === "Monthly" && recurrence.dayOfMonth != null &&
            (recurrence.dayOfMonth < 1 || recurrence.dayOfMonth > 31)) ||
          (date && recurrence.endDate && recurrence.endDate < date)) {
        setError(t("editModal.invalidRecurrence"));
        return;
      }
    }
    onSave({ ...initial, title: title.trim(), description: description.trim() || null, date, startTime, endTime, recurrence });
  };

  const endDateMin = date && date > bounds.min ? date : bounds.min;
  const toggle = (picker: Picker) => {
    if (open === picker) { setOpen(null); return; }
    // Fill an empty field, and pull a date the wheels can't show (past, too far) into range.
    if (picker === "date") setDate(clampDate(date ?? bounds.min, bounds.min, bounds.max));
    if (picker === "time") {
      const filled = fillDraftTimes(startTime, endTime);
      setStartTime(filled.start);
      setEndTime(filled.end);
    }
    if (picker === "endDate" && recurrence?.endDate) {
      setRecurrence({ ...recurrence, endDate: clampDate(recurrence.endDate, endDateMin, bounds.max) });
    }
    setOpen(picker);
  };

  // The end follows the start and keeps the task's length.
  const changeStart = (next: string) => {
    const nextEnd = shiftEnd(startTime, next, endTime);
    setStartTime(next);
    if (nextEnd !== endTime) {
      setEndTime(nextEnd);
      setEndWheelKey((key) => key + 1);
    }
  };

  const length = draftLength(startTime, endTime);
  const dateText = (date && formatDraftWhen({ date, startTime: null, endTime: null }, t, language)) || t("draft.notSet");
  const timeText = startTime
    ? `${startTime}–${endTime ?? "—"}${length ? ` · ${formatDuration(length, t)}` : ""}`
    : t("draft.notSet");
  const wheelLocale = language.startsWith("zh") ? "zh-CN" : "en";

  const row = (icon: IconName, label: string, value: string, picker: Picker) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      accessibilityState={{ expanded: open === picker, disabled: busy }}
      className="flex-row items-center py-2"
      disabled={busy}
      onPress={() => toggle(picker)}
    >
      <Ionicons name={icon} size={18} color="#555555" />
      <View className="ml-3">
        <Text className="font-inter text-[13px] text-[#1E1E1E]">{label}</Text>
        <Text className="font-inter text-[11px] text-highlight mt-0.5">{value}</Text>
      </View>
    </Pressable>
  );
  const divider = <View className="h-px bg-[#E6E6E6] ml-[30px] my-1" />;
  const sectionLabel = (text: string) => (
    <Text className="font-inter text-[13px] text-[#6E6E6E] mt-4 mb-2 ml-0.5">{text}</Text>
  );
  const timeWheel = (label: string, value: string, onChange: (time: string) => void, key?: number) => (
    <View className="items-center">
      <Text className="font-inter text-[11px] text-[#555555]">{label}</Text>
      <View>
        <WheelBand itemHeight={36} />
        <TimePicker key={key} value={timeAsDate(value)} minuteStep={5} width={136} wheelWidth={52} itemHeight={36}
          onChange={(picked) => onChange(format(picked, "HH:mm"))} />
      </View>
    </View>
  );

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={cancel}
      onBackButtonPress={cancel}
      backdropOpacity={0.4}
      avoidKeyboard
      style={{ justifyContent: "flex-end", margin: 0 }}
    >
      {/* Sits on the bottom edge; the padding keeps the content above the home indicator. */}
      <View className="bg-[#F5F5F5] rounded-t-[30px] px-4"
        style={{ maxHeight: "92%", paddingBottom: Math.max(insets.bottom, 16) }}>
        <View className="items-center pt-1.5">
          <View className="w-8 h-1 rounded-full bg-[#C4C4C4]" />
        </View>
        <View className="flex-row items-center justify-between mt-3">
          <Pressable accessibilityRole="button" accessibilityLabel={t("editModal.cancel")} disabled={busy} hitSlop={8}
            onPress={cancel} className="w-9 h-9 rounded-full bg-white items-center justify-center">
            <Ionicons name="close" size={20} color="#222222" />
          </Pressable>
          <Text className="font-inter font-semibold text-[15px] text-[#1E1E1E]">{t("editModal.title")}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("editModal.save")} disabled={busy} hitSlop={8}
            onPress={save} className={`w-9 h-9 rounded-full bg-highlight items-center justify-center ${busy ? "opacity-50" : ""}`}>
            <Ionicons name="checkmark" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {error && <Text className="font-inter text-warning text-sm mt-2 text-center">{error}</Text>}

        <ScrollView className="shrink mt-3.5" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-[18px] px-4 py-3">
            <TextInput
              className="font-inter font-semibold text-base text-[#1E1E1E] py-1"
              value={title}
              placeholder={t("editModal.taskTitle")}
              placeholderTextColor="#C8C8C8"
              accessibilityLabel={t("editModal.taskTitle")}
              onChangeText={setTitle}
              editable={!busy}
            />
            <TextInput
              className="font-inter text-[13px] text-secondary mt-2 min-h-[36px]"
              multiline
              value={description}
              placeholder={t("editModal.notes")}
              placeholderTextColor="#C8C8C8"
              accessibilityLabel={t("editModal.notes")}
              onChangeText={setDescription}
              editable={!busy}
              textAlignVertical="top"
            />
          </View>

          {sectionLabel(t("editModal.dateAndTime"))}
          <View className="bg-white rounded-[18px] px-4 py-2">
            {row("calendar-clear-outline", t(initial.recurrence ? "editModal.startDate" : "editModal.date"), dateText, "date")}
            {open === "date" && date && (
              <View className="items-center py-1">
                <DraftDateWheels value={date} min={bounds.min} max={bounds.max} locale={wheelLocale} onChange={setDate} />
              </View>
            )}
            {divider}
            {row("time-outline", t("editModal.time"), timeText, "time")}
            {open === "time" && startTime && endTime && (
              <View className="flex-row justify-between pt-1 pb-2">
                {timeWheel(t("editModal.startTime"), startTime, changeStart)}
                {timeWheel(t("editModal.endTime"), endTime, setEndTime, endWheelKey)}
              </View>
            )}
          </View>

          {recurrence && (
            <>
              {sectionLabel(t("editModal.recurrence"))}
              <View className="bg-white rounded-[18px] px-4 py-3">
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {frequencies.map((frequency) => (
                    <Pressable key={frequency} disabled={busy}
                      className={`px-3 py-2 rounded-lg ${recurrence.frequency === frequency ? "bg-highlight" : "bg-gray-100"}`}
                      onPress={() => setRecurrence({ ...recurrence, frequency,
                        daysOfWeek: frequency === "Weekly" ? recurrence.daysOfWeek || 1 : null,
                        dayOfMonth: frequency === "Monthly" ? recurrence.dayOfMonth : null })}>
                      <Text className={`font-inter ${recurrence.frequency === frequency ? "text-white" : "text-secondary"}`}>
                        {t(`editModal.frequency.${frequency}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text className="font-inter text-[13px] text-secondary">{t("editModal.interval")}</Text>
                <TextInput keyboardType="number-pad" editable={!busy}
                  className="border border-gray-200 rounded-xl px-3 py-2 mt-1 mb-3 font-inter text-secondary"
                  value={String(recurrence.interval)}
                  onChangeText={(value) => setRecurrence({ ...recurrence, interval: Number(value) })} />
                {recurrence.frequency === "Weekly" && (
                  <View className="flex-row justify-between mb-3">
                    {weekdays.map((flag, index) => (
                      <Pressable key={flag} disabled={busy}
                        className={`px-2 py-2 rounded-lg ${(recurrence.daysOfWeek ?? 0) & flag ? "bg-highlight" : "bg-gray-100"}`}
                        onPress={() => setRecurrence({ ...recurrence,
                          daysOfWeek: (recurrence.daysOfWeek ?? 0) ^ flag })}>
                        <Text className={`font-inter ${(recurrence.daysOfWeek ?? 0) & flag ? "text-white" : "text-secondary"}`}>
                          {t(`editModal.weekday.${index}`)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {recurrence.frequency === "Monthly" && (
                  <>
                    <Text className="font-inter text-[13px] text-secondary">{t("editModal.dayOfMonth")}</Text>
                    <TextInput keyboardType="number-pad" editable={!busy}
                      className="border border-gray-200 rounded-xl px-3 py-2 mt-1 mb-3 font-inter text-secondary"
                      value={recurrence.dayOfMonth == null ? "" : String(recurrence.dayOfMonth)}
                      onChangeText={(value) => setRecurrence({ ...recurrence,
                        dayOfMonth: value ? Number(value) : null })} />
                  </>
                )}
                {divider}
                {row("flag-outline", t("editModal.endDate"), recurrence.endDate
                  ? formatDraftWhen({ date: recurrence.endDate, startTime: null, endTime: null }, t, language) ?? recurrence.endDate
                  : t("editModal.noEndDate"), "endDate")}
                {open === "endDate" && (
                  <View className="items-center py-1">
                    <DraftDateWheels value={recurrence.endDate ?? endDateMin} min={endDateMin} max={bounds.max} locale={wheelLocale}
                      onChange={(endDate) => setRecurrence({ ...recurrence, endDate })} />
                  </View>
                )}
                {recurrence.endDate && (
                  <Pressable disabled={busy} onPress={() => { setOpen(null); setRecurrence({ ...recurrence, endDate: null }); }}>
                    <Text className="font-inter text-[13px] text-primary underline py-2">{t("editModal.noEndDate")}</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

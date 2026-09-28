import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import TimePicker from "@/feature/task-add-edit/components/time-picker";
import { SingleDateCalendar } from "@/feature/task-add-edit/components/single-date-calendar";
import { DraftRecurrenceDto, EditedDraftItemDto } from "../models/ai-coach-dto";

type PickerTarget = "date" | "startTime" | "endTime" | "endDate" | null;

const weekdays = [1, 2, 4, 8, 16, 32, 64] as const;
const frequencies: DraftRecurrenceDto["frequency"][] = ["Daily", "Weekly", "Monthly", "Yearly"];

function toDate(dateStr: string | null, timeStr: string | null): Date {
  return new Date(`${dateStr ?? format(new Date(), "yyyy-MM-dd")}T${timeStr ?? "09:00"}:00`);
}

/** Edit a task draft; scheduling fields may remain unset until confirmation. */
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
  const { t } = useTranslation("aiCoach");
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [recurrence, setRecurrence] = useState(initial.recurrence);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [error, setError] = useState<string | null>(null);

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
    onSave({ ...initial, title: title.trim(), date, startTime, endTime, recurrence });
  };

  const fieldRow = (label: string, value: string | null, target: PickerTarget) => (
    <Pressable
      className="flex-row justify-between items-center py-3 border-b border-gray-100"
      disabled={busy}
      onPress={() => setPickerTarget(pickerTarget === target ? null : target)}
    >
      <Text className="font-baloo text-secondary text-base">{label}</Text>
      <Text className="font-balooBold text-info text-base">{value ?? t("draft.notSet")}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 bg-black/40 justify-center px-5">
        <View className="bg-white rounded-2xl p-5 max-h-[85%]">
          <Text className="font-balooBold text-lg text-secondary mb-3">{t("editModal.title")}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text className="font-baloo text-primary text-sm mb-1">{t("editModal.taskTitle")}</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-3 py-2 font-baloo text-base text-secondary mb-2"
              value={title}
              onChangeText={setTitle}
              editable={!busy}
            />

            {fieldRow(t(initial.recurrence ? "editModal.startDate" : "editModal.date"), date, "date")}
            {pickerTarget === "date" && (
              <SingleDateCalendar
                defaultStartDate={date ?? format(new Date(), "yyyy-MM-dd")}
                onStartDateChange={(d) => setDate(format(d, "yyyy-MM-dd"))}
              />
            )}

            {fieldRow(t("editModal.startTime"), startTime, "startTime")}
            {pickerTarget === "startTime" && (
              <TimePicker
                value={toDate(date, startTime)}
                onChange={(d) => setStartTime(format(d, "HH:mm"))}
              />
            )}

            {fieldRow(t("editModal.endTime"), endTime, "endTime")}
            {pickerTarget === "endTime" && (
              <TimePicker
                value={toDate(date, endTime)}
                onChange={(d) => setEndTime(format(d, "HH:mm"))}
              />
            )}

            {recurrence && (
              <View className="mt-4 border-t border-gray-100 pt-3">
                <Text className="font-balooBold text-secondary mb-2">{t("editModal.recurrence")}</Text>
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {frequencies.map((frequency) => (
                    <Pressable key={frequency} disabled={busy}
                      className={`px-3 py-2 rounded-lg ${recurrence.frequency === frequency ? "bg-highlight" : "bg-gray-100"}`}
                      onPress={() => setRecurrence({ ...recurrence, frequency,
                        daysOfWeek: frequency === "Weekly" ? recurrence.daysOfWeek || 1 : null,
                        dayOfMonth: frequency === "Monthly" ? recurrence.dayOfMonth : null })}>
                      <Text className={recurrence.frequency === frequency ? "text-white" : "text-secondary"}>
                        {t(`editModal.frequency.${frequency}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text className="font-baloo text-secondary">{t("editModal.interval")}</Text>
                <TextInput keyboardType="number-pad" editable={!busy}
                  className="border border-gray-200 rounded-xl px-3 py-2 mb-3 text-secondary"
                  value={String(recurrence.interval)}
                  onChangeText={(value) => setRecurrence({ ...recurrence, interval: Number(value) })} />
                {recurrence.frequency === "Weekly" && (
                  <View className="flex-row justify-between mb-3">
                    {weekdays.map((flag, index) => (
                      <Pressable key={flag} disabled={busy}
                        className={`px-2 py-2 rounded-lg ${(recurrence.daysOfWeek ?? 0) & flag ? "bg-highlight" : "bg-gray-100"}`}
                        onPress={() => setRecurrence({ ...recurrence,
                          daysOfWeek: (recurrence.daysOfWeek ?? 0) ^ flag })}>
                        <Text className={(recurrence.daysOfWeek ?? 0) & flag ? "text-white" : "text-secondary"}>
                          {t(`editModal.weekday.${index}`)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {recurrence.frequency === "Monthly" && (
                  <>
                    <Text className="font-baloo text-secondary">{t("editModal.dayOfMonth")}</Text>
                    <TextInput keyboardType="number-pad" editable={!busy}
                      className="border border-gray-200 rounded-xl px-3 py-2 mb-3 text-secondary"
                      value={recurrence.dayOfMonth == null ? "" : String(recurrence.dayOfMonth)}
                      onChangeText={(value) => setRecurrence({ ...recurrence,
                        dayOfMonth: value ? Number(value) : null })} />
                  </>
                )}
                {fieldRow(t("editModal.endDate"), recurrence.endDate, "endDate")}
                {recurrence.endDate && (
                  <Pressable onPress={() => setRecurrence({ ...recurrence, endDate: null })}>
                    <Text className="font-baloo text-primary underline py-2">{t("editModal.noEndDate")}</Text>
                  </Pressable>
                )}
                {pickerTarget === "endDate" && (
                  <SingleDateCalendar defaultStartDate={recurrence.endDate ?? date ?? format(new Date(), "yyyy-MM-dd")}
                    onStartDateChange={(d) => setRecurrence({ ...recurrence, endDate: format(d, "yyyy-MM-dd") })} />
                )}
              </View>
            )}

            {error && <Text className="font-baloo text-warning text-sm mt-2">{error}</Text>}
          </ScrollView>

          <View className="flex-row gap-3 mt-4">
            <Pressable
              className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
              disabled={busy}
              onPress={onCancel}
            >
              <Text className="font-balooBold text-secondary">{t("editModal.cancel")}</Text>
            </Pressable>
            <Pressable
              className="flex-1 py-3 rounded-xl bg-highlight items-center"
              disabled={busy}
              onPress={save}
            >
              <Text className="font-balooBold text-white">{t("editModal.save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

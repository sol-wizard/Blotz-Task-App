import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import TimePicker from "@/feature/task-add-edit/components/time-picker";
import { SingleDateCalendar } from "@/feature/task-add-edit/components/single-date-calendar";
import { EditedDraftItemDto } from "../models/ai-coach-dto";

type PickerTarget = "date" | "startTime" | "endTime" | null;

function toDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

/**
 * Edits the four editable fields of ONE task on the card (requirements §9.3): title, date,
 * start, end. Reuses the app's existing wheel time picker and calendar. Validation beyond
 * end>start stays server-side (§22.7) — the server re-validates everything anyway.
 */
export function DraftEditModal({
  visible,
  initial,
  onCancel,
  onSave,
}: {
  visible: boolean;
  initial: EditedDraftItemDto;
  onCancel: () => void;
  onSave: (edited: EditedDraftItemDto) => void;
}) {
  const { t } = useTranslation("aiCoach");
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (toDate(date, endTime) <= toDate(date, startTime)) {
      setError(t("editModal.endBeforeStart"));
      return;
    }
    onSave({ ...initial, title: title.trim(), date, startTime, endTime });
  };

  const fieldRow = (label: string, value: string, target: PickerTarget) => (
    <Pressable
      className="flex-row justify-between items-center py-3 border-b border-gray-100"
      onPress={() => setPickerTarget(pickerTarget === target ? null : target)}
    >
      <Text className="font-baloo text-secondary text-base">{label}</Text>
      <Text className="font-balooBold text-info text-base">{value}</Text>
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
              maxLength={120}
            />

            {fieldRow(t("editModal.date"), date, "date")}
            {pickerTarget === "date" && (
              <SingleDateCalendar
                defaultStartDate={date}
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

            {error && <Text className="font-baloo text-warning text-sm mt-2">{error}</Text>}
          </ScrollView>

          <View className="flex-row gap-3 mt-4">
            <Pressable
              className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
              onPress={onCancel}
            >
              <Text className="font-balooBold text-secondary">{t("editModal.cancel")}</Text>
            </Pressable>
            <Pressable className="flex-1 py-3 rounded-xl bg-highlight items-center" onPress={save}>
              <Text className="font-balooBold text-white">{t("editModal.save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

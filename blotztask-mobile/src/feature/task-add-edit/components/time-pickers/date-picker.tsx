import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import Modal from "react-native-modal";
import { Calendar } from "react-native-calendars";

type Props = {
  value: Date | null;
  onChange: (d: Date | null) => void;
};

export default function DatePicker({ value, onChange }: Props) {
  const [openCalendar, setOpenCalendar] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | null>(null);

  const handleConfirm = () => {
    if (draftDate) {
      onChange(draftDate);
    }
    setOpenCalendar(false);
  };

  const handleCancel = () => {
    setOpenCalendar(false);
  };

  const markedDateString = format(
    openCalendar ? (draftDate ?? new Date()) : (value ?? new Date()),
    "yyyy-MM-dd",
  );

  return (
    <View className="pb-2">
      <Pressable
        onPress={() => {
          setDraftDate(value ?? new Date());
          setOpenCalendar(true);
        }}
        className="flex-row items-center justify-between px-3 py-2 rounded-xl border border-gray-300 bg-white"
      >
        <Text className={`text-base ${value ? "text-slate-700" : "text-slate-400"}`}>
          {openCalendar
            ? draftDate
              ? format(draftDate, "dd/MM/yy")
              : "DD/MM/YY"
            : value
              ? format(value, "dd/MM/yy")
              : "DD/MM/YY"}
        </Text>
        <Ionicons name="calendar-outline" size={22} color="#3b3f58" />
      </Pressable>

      <Modal
        isVisible={openCalendar}
        backdropColor="black"
        backdropOpacity={0.5}
        onBackdropPress={() => setOpenCalendar(false)}
        presentationStyle="overFullScreen"
      >
        <View className="w-full max-w-md rounded-2xl bg-white p-4">
          <Calendar
            theme={{
              todayTextColor: "#3B82F6",
              arrowColor: "#3B82F6",
            }}
            onDayPress={(date) => setDraftDate(new Date(date.timestamp))}
            markedDates={{
              [markedDateString]: {
                selected: true,
                selectedColor: "#3B82F6",
                selectedTextColor: "white",
              },
            }}
            enableSwipeMonths={true}
          />

          <View className="flex-row justify-end mt-2 space-x-3">
            <Pressable onPress={handleCancel} className="px-4 py-2 rounded-lg">
              <Text className="text-slate-600">Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} className="px-4 py-2 rounded-lg bg-blue-500">
              <Text className="text-white font-medium">Confirm</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

import React, { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

export default function DatePicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<Date>(value);

  const onNativeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (selected) setTemp(selected);
  };

  const handleConfirm = () => {
    onChange(temp);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setTemp(value ?? new Date());
          setOpen(true);
        }}
        className="flex-row items-center justify-between px-3 py-2 rounded-xl border border-gray-300 bg-white"
      >
        <Text
          className={`text-base ${value ? "text-slate-700" : "text-slate-400"}`}
        >
          {format(value, "dd/MM/yy")}
        </Text>
        <Ionicons name="calendar-outline" size={22} color="#3b3f58" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setOpen(false)}
        />

        <View className="absolute inset-x-4 bottom-8 rounded-2xl bg-white p-4">
          <Text className="text-lg font-semibold text-slate-800 mb-3">
            Select date
          </Text>

          <View className="items-center">
            <DateTimePicker
              value={temp}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={onNativeChange}
              style={{ alignSelf: "stretch" }}
            />
          </View>

          <View className="flex-row justify-end mt-2 space-x-3">
            <Pressable
              onPress={() => setOpen(false)}
              className="px-4 py-2 rounded-lg"
            >
              <Text className="text-slate-600">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              className="px-4 py-2 rounded-lg bg-blue-500"
            >
              <Text className="text-white font-medium">Confirm</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

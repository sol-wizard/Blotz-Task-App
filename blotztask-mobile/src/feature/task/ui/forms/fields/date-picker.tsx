import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import Modal from "react-native-modal";

type Props = {
  value?: Date;
  onChange: (d: Date) => void;
};

export default function DatePicker({ value, onChange }: Props) {
  const [openCalendar, setOpenCalendar] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(value);

  const onNativeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (selected) setTempDate(selected);
  };

  const handleConfirm = () => {
    if (tempDate) {
      onChange(tempDate);
    }
    setOpenCalendar(false);
  };

  const handleCanel = () => {
    setTempDate(undefined);
    setOpenCalendar(false);
  };

  return (
    <View className="pb-2">
      <Pressable
        onPress={() => {
          setTempDate(value ?? new Date());
          setOpenCalendar(true);
        }}
        className="flex-row items-center justify-between px-3 py-2 rounded-xl border border-gray-300 bg-white"
      >
        <Text className={`text-base ${value ? "text-slate-700" : "text-slate-400"}`}>
          {tempDate ? format(tempDate, "dd/MM/yy") : "DD/MM/YY"}
        </Text>
        <Ionicons name="calendar-outline" size={22} color="#3b3f58" />
      </Pressable>

      <Modal
        isVisible={openCalendar}
        backdropColor="black"
        backdropOpacity={0.5}
        onBackdropPress={() => setOpenCalendar(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <View className="absolute inset-0 items-center justify-center px-4">
          <View className="w-full max-w-md rounded-2xl bg-white p-4">
            <View className="items-center">
              <DateTimePicker
                value={tempDate ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                locale={Platform.OS === "ios" ? "en-GB" : undefined}
                minimumDate={new Date(1900, 0, 1)}
                onChange={onNativeChange}
                style={{ alignSelf: "stretch" }}
              />
            </View>

            <View className="flex-row justify-end mt-2 space-x-3">
              <Pressable onPress={handleCanel} className="px-4 py-2 rounded-lg">
                <Text className="text-slate-600">Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirm} className="px-4 py-2 rounded-lg bg-blue-500">
                <Text className="text-white font-medium">Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

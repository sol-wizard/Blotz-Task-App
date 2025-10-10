import { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export const TimePicker12H = ({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());

  const handleChange = (event: any, selectedDate?: Date) => {
    // Update temp date as user scrolls
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleOpenPicker = () => {
    setTempDate(value || new Date());
    setShowPicker(true);
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return null;

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    const hoursStr = String(hours).padStart(2, "0");
    const minutesStr = String(minutes).padStart(2, "0");

    return { hoursStr, minutesStr, ampm };
  };

  const timeDisplay = formatTime(value);

  return (
    <View>
      {/* Display Button */}
      <Pressable
        onPress={handleOpenPicker}
        className="flex-row items-center bg-white rounded-xl px-4 py-3 active:bg-gray-50"
      >
        {timeDisplay ? (
          <>
            <Text className="text-2xl font-semibold text-gray-800">
              {timeDisplay.hoursStr}:{timeDisplay.minutesStr}
            </Text>
            <Text className="text-lg font-semibold text-blue-500 ml-2">{timeDisplay.ampm}</Text>
          </>
        ) : (
          <Text className="text-lg font-medium text-gray-400">Select Time</Text>
        )}
      </Pressable>

      {/* Modal with Spinner Picker (Both Platforms) */}
      {showPicker && (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={handleCancel}>
          <View className="flex-1 justify-end">
            {/* Backdrop */}
            <Pressable className="flex-1 bg-black/30" onPress={handleCancel} />

            {/* Picker Container */}
            <View className="bg-white rounded-t-3xl">
              {/* Header */}
              <View className="border-b border-gray-200 flex-row justify-between items-center px-4 py-3">
                <Pressable onPress={handleCancel}>
                  <Text className="text-blue-500 text-base font-semibold">Cancel</Text>
                </Pressable>
                <Text className="text-base font-semibold text-gray-800">Select Time</Text>
                <Pressable onPress={handleConfirm}>
                  <Text className="text-blue-500 text-base font-bold">Done</Text>
                </Pressable>
              </View>

              <View className="items-center">
                {/* Picker */}
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={handleChange}
                  style={{ height: 200 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

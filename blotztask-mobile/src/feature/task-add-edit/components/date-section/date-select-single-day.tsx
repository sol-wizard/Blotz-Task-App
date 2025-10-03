import { View, Text } from "react-native";
import React, { useState } from "react";
import { RadioButton } from "react-native-paper";
import CalendarDatePicker from "./calendar-date-picker";

const DateSelectSingleDay = () => {
  const [selected, setSelected] = useState("Today");
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <View className="w-full">
      <RadioButton.Group
        onValueChange={(value) => {
          setSelected(value);
          if (value === "Select Date") {
            setShowCalendar(true);
          }
        }}
        value={selected}
      >
        <View className="flex-row justify-start gap-12">
          {["Today", "Tomorrow"].map((option) => (
            <View key={option} className="flex-row items-center gap-2">
              <View
                className={`rounded-full p-1 flex justify-center items-center ${
                  selected === option ? "bg-blue-100" : "bg-white"
                }`}
                style={{ transform: [{ scale: 0.5 }] }}
              >
                <RadioButton value={option} color="#B0D0FA" />
              </View>
              <Text className="text-lg">{option}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row justify-start items-center gap-2 mt-3">
          <View
            className={`rounded-full p-1 flex justify-center items-center ${
              selected === "Select Date" ? "bg-blue-100" : "bg-white"
            }`}
            style={{ transform: [{ scale: 0.5 }] }}
          >
            <RadioButton value="Select Date" color="#B0D0FA" />
          </View>
          <Text className="text-lg">Select Date</Text>
        </View>
      </RadioButton.Group>

      {/* Calendar Modal */}
      <CalendarDatePicker
        allowRangeSelection={false}
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSave={(date) => {
          setSelected(date || "Select Date");
          setShowCalendar(false);
        }}
      />
    </View>
  );
};

export default DateSelectSingleDay;
